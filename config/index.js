'use strict';

require('dotenv').config();

/**
 * Tum yapilandirma tek yerden okunur.
 * Kod icinde asla dogrudan process.env kullanma - hep buradan al.
 * Boylece bir ayarin nereden geldigi ve varsayilaninin ne oldugu tek bakista gorunur.
 */

function num(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',

  port: num(process.env.PORT, 3000),

  // Bos birakilirsa CORS kapali kabul edilir (ayni origin'den servis ediliyor demektir).
  // Frontend ayri bir porttan calisacaksa: CORS_ORIGINS=http://localhost:5500
  corsOrigins: list(process.env.CORS_ORIGINS),

  pokeapi: {
    baseUrl: process.env.POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2',
    // PokeAPI takilirsa istegi kesip 504 donduruyoruz; yoksa sunucu bosuna bekler.
    timeoutMs: num(process.env.POKEAPI_TIMEOUT_MS, 8000),
    // Sadece gecici hatalarda (timeout, 5xx, 429) tekrar denenir.
    retries: num(process.env.POKEAPI_RETRIES, 2),
    retryBaseDelayMs: num(process.env.POKEAPI_RETRY_DELAY_MS, 250),
  },

  cache: {
    // Pokemon verisi neredeyse hic degismez, uzun TTL guvenli.
    detailTtlMs: num(process.env.CACHE_DETAIL_TTL_MS, 1000 * 60 * 60 * 24),
    listTtlMs: num(process.env.CACHE_LIST_TTL_MS, 1000 * 60 * 60 * 6),
    maxEntries: num(process.env.CACHE_MAX_ENTRIES, 2000),
  },

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
    max: num(process.env.RATE_LIMIT_MAX, 120),
  },

  pagination: {
    defaultLimit: num(process.env.DEFAULT_LIMIT, 20),
    maxLimit: num(process.env.MAX_LIMIT, 100),
    // detailed=true ile ayni anda cekilecek detay sayisi siniri.
    maxDetailedLimit: num(process.env.MAX_DETAILED_LIMIT, 30),
  },
};

module.exports = config;
