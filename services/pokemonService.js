'use strict';

const pokeApi = require('./pokeApiClient');
const TTLCache = require('../utils/TTLCache');
const ApiError = require('../utils/ApiError');
const config = require('../config');

/**
 * Is mantigi katmani.
 *
 * PokeAPI'nin ham cevabi cok buyuk ve dagiliktir (tek pokemon ~200KB,
 * icinde onlarca oyun surumunun sprite'lari, move listeleri vs. var).
 * Burada frontend'in gercekten ihtiyaci olan alanlari secip
 * SABIT ve SADE bir sekle donusturuyoruz.
 *
 * Bu neden onemli: frontend'i (Kisi 3) PokeAPI'nin yapisina bagimli
 * yapmiyoruz. PokeAPI yarin alan adi degistirse bile sadece bu dosyayi
 * duzeltirsiniz, frontend'e dokunmaniz gerekmez.
 */

const detailCache = new TTLCache({
  ttlMs: config.cache.detailTtlMs,
  maxEntries: config.cache.maxEntries,
});

const listCache = new TTLCache({
  ttlMs: config.cache.listTtlMs,
  maxEntries: 200,
});

const ARTWORK_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

/** PokeAPI url'inden id ayikla: '.../pokemon/25/' -> 25 */
function extractId(url) {
  const match = /\/(\d+)\/?$/.exec(url || '');
  return match ? Number(match[1]) : null;
}

function artworkUrl(id) {
  return id ? `${ARTWORK_BASE}/${id}.png` : null;
}

/** 'mr-mime' -> 'Mr Mime' */
function displayName(name) {
  return String(name || '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Ham PokeAPI pokemon cevabini sade karta cevirir. */
function formatDetail(raw) {
  const stats = {};
  for (const entry of raw.stats || []) {
    stats[entry.stat.name] = entry.base_stat;
  }

  const totalStats = Object.values(stats).reduce((sum, value) => sum + value, 0);

  return {
    id: raw.id,
    name: raw.name,
    displayName: displayName(raw.name),
    types: (raw.types || []).map((entry) => entry.type.name),
    image:
      raw.sprites?.other?.['official-artwork']?.front_default ||
      raw.sprites?.front_default ||
      artworkUrl(raw.id),
    sprite: raw.sprites?.front_default || null,
    shinyImage: raw.sprites?.other?.['official-artwork']?.front_shiny || null,
    // PokeAPI yuksekligi desimetre, agirligi hektogram olarak verir.
    height: raw.height != null ? Number((raw.height / 10).toFixed(1)) : null,
    weight: raw.weight != null ? Number((raw.weight / 10).toFixed(1)) : null,
    baseExperience: raw.base_experience ?? null,
    abilities: (raw.abilities || []).map((entry) => ({
      name: entry.ability.name,
      displayName: displayName(entry.ability.name),
      isHidden: Boolean(entry.is_hidden),
    })),
    stats: {
      hp: stats.hp ?? 0,
      attack: stats.attack ?? 0,
      defense: stats.defense ?? 0,
      specialAttack: stats['special-attack'] ?? 0,
      specialDefense: stats['special-defense'] ?? 0,
      speed: stats.speed ?? 0,
    },
    totalStats,
  };
}

/**
 * Tum pokemon adlarinin indeksi.
 * Tek seferde cekilip uzun sure cache'lenir; arama ve sayfalama
 * bunun uzerinden BELLEKTE yapilir. Boylece her aramada PokeAPI'ye
 * gitmek zorunda kalmayiz - arama aninda cevap verir.
 */
async function getIndex() {
  return listCache.wrap(
    'index:all',
    async () => {
      const data = await pokeApi.get('/pokemon?limit=100000&offset=0');
      return (data.results || [])
        .map((item) => ({ id: extractId(item.url), name: item.name }))
        .filter((item) => item.id !== null);
    },
    config.cache.listTtlMs
  );
}

/** Belirli bir turdeki pokemonlarin listesi. */
async function getIndexByType(type) {
  return listCache.wrap(
    `index:type:${type}`,
    async () => {
      const data = await pokeApi.get(`/type/${encodeURIComponent(type)}`);
      return (data.pokemon || [])
        .map((item) => ({ id: extractId(item.pokemon.url), name: item.pokemon.name }))
        .filter((item) => item.id !== null)
        .sort((a, b) => a.id - b.id);
    },
    config.cache.listTtlMs
  );
}

/** Tek bir pokemonun detayi. */
async function getPokemonDetail(identifier) {
  return detailCache.wrap(
    `detail:${identifier}`,
    async () => {
      const raw = await pokeApi.get(`/pokemon/${encodeURIComponent(identifier)}`);
      return formatDetail(raw);
    },
    config.cache.detailTtlMs
  );
}

/** Tur (species) bilgisi - detay sayfasindaki aciklama metni icin. */
async function getPokemonSpecies(identifier) {
  return detailCache.wrap(
    `species:${identifier}`,
    async () => {
      const raw = await pokeApi.get(`/pokemon-species/${encodeURIComponent(identifier)}`);

      const entry =
        (raw.flavor_text_entries || []).find((item) => item.language.name === 'en') || null;
      const genus = (raw.genera || []).find((item) => item.language.name === 'en') || null;

      return {
        id: raw.id,
        name: raw.name,
        // Aciklama metinlerinde form-feed ve satir sonu karakterleri var, temizliyoruz.
        description: entry ? entry.flavor_text.replace(/[\f\n\r]+/g, ' ').trim() : null,
        genus: genus ? genus.genus : null,
        color: raw.color?.name ?? null,
        habitat: raw.habitat?.name ?? null,
        generation: raw.generation?.name ?? null,
        isLegendary: Boolean(raw.is_legendary),
        isMythical: Boolean(raw.is_mythical),
        captureRate: raw.capture_rate ?? null,
        evolvesFrom: raw.evolves_from_species?.name ?? null,
      };
    },
    config.cache.detailTtlMs
  );
}

/** Filtre menusu icin tum turler. */
async function getTypes() {
  return listCache.wrap(
    'types:all',
    async () => {
      const data = await pokeApi.get('/type');
      return (data.results || [])
        .map((item) => ({
          name: item.name,
          displayName: displayName(item.name),
          id: extractId(item.url),
        }))
        // 'unknown' ve 'shadow' gercek oyun turleri degil, listeden cikariyoruz.
        .filter((item) => !['unknown', 'shadow'].includes(item.name));
    },
    config.cache.listTtlMs
  );
}

/**
 * Kart listesi - arama, tur filtresi ve sayfalama ile.
 *
 * detailed=true verilirse sayfadaki her pokemonun tam detayi da cekilir.
 * Promise.allSettled kullaniyoruz: tek bir pokemon hata verirse
 * tum sayfa comeyip o kart ozet haliyle doner.
 */
async function getPokemonList({ limit, offset, search = null, type = null, detailed = false }) {
  let pool = type ? await getIndexByType(type) : await getIndex();

  if (type && pool.length === 0) {
    throw ApiError.notFound('Bu turde pokemon bulunamadi.', 'TYPE_NOT_FOUND');
  }

  if (search) {
    pool = pool.filter((item) => item.name.includes(search));
  }

  const total = pool.length;
  const page = pool.slice(offset, offset + limit);

  let results = page.map((item) => ({
    id: item.id,
    name: item.name,
    displayName: displayName(item.name),
    image: artworkUrl(item.id),
  }));

  if (detailed && page.length > 0) {
    const settled = await Promise.allSettled(
      page.map((item) => getPokemonDetail(String(item.id)))
    );
    results = settled.map((outcome, index) =>
      outcome.status === 'fulfilled' ? outcome.value : results[index]
    );
  }

  return {
    total,
    limit,
    offset,
    count: results.length,
    hasMore: offset + results.length < total,
    filters: { search, type, detailed },
    results,
  };
}

function cacheStats() {
  return { detail: detailCache.stats(), list: listCache.stats() };
}

function clearCaches() {
  detailCache.clear();
  listCache.clear();
}

module.exports = {
  getPokemonList,
  getPokemonDetail,
  getPokemonSpecies,
  getTypes,
  cacheStats,
  clearCaches,
};
