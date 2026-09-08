'use strict';

/**
 * Sureli (TTL) + boyut sinirli (LRU) bellek ici cache.
 *
 * Iki onemli ozelligi var:
 *
 * 1) maxEntries siniri: sinirsiz buyuyen bir Map, uzun calisan sunucuda
 *    bellek sizintisidir. Sinira gelince en eski kullanilan kayit atilir.
 *
 * 2) wrap() ile "in-flight deduplication": ayni anda 50 kisi pikachu isterse
 *    PokeAPI'ye 50 degil 1 istek gider, digerleri ayni sozu (promise) bekler.
 *    Bu, dis servise gereksiz yuk bindirmemenin en etkili yolu.
 *
 * Not: Bu cache sunucu yeniden baslayinca sifirlanir. Tek sunucu icin fazlasiyla
 * yeterli; ilerde birden fazla sunucuya cikarsaniz Redis'e tasinabilir.
 */
class TTLCache {
  #store = new Map();
  #inflight = new Map();

  constructor({ ttlMs = 5 * 60 * 1000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.#store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.#store.delete(key);
      this.misses += 1;
      return undefined;
    }

    // LRU: erisilen kaydi sona tasi ki en eski hep basta kalsin.
    this.#store.delete(key);
    this.#store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (!this.#store.has(key) && this.#store.size >= this.maxEntries) {
      const oldestKey = this.#store.keys().next().value;
      this.#store.delete(oldestKey);
    }
    this.#store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  /**
   * Cache'te varsa dondurur, yoksa producer'i calistirip sonucu saklar.
   * Ayni key icin es zamanli cagrilar tek bir producer calismasini paylasir.
   */
  async wrap(key, producer, ttlMs = this.ttlMs) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const pending = this.#inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await producer();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        // Hata durumunda da temizle, yoksa key kalici olarak kilitlenir.
        this.#inflight.delete(key);
      }
    })();

    this.#inflight.set(key, promise);
    return promise;
  }

  delete(key) {
    return this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
    this.#inflight.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.#store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : Number((this.hits / total).toFixed(3)),
      inflight: this.#inflight.size,
    };
  }
}

module.exports = TTLCache;
