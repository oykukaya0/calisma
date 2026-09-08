'use strict';

const ApiError = require('./ApiError');
const config = require('../config');

/**
 * GUVENLIK NOTU - bu dosyanin varlik sebebi:
 *
 * Kullanicidan gelen deger, disari attigimiz URL'in icine giriyor:
 *     fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
 *
 * Eger dogrulamazsak biri su istegi atabilir:
 *     GET /api/pokemon/..%2F..%2Fberry%2F1
 * ve sunucumuzu istemedigimiz adreslere istek atan bir arac haline getirir
 * (SSRF / path traversal). Bunu iki katmanla engelliyoruz:
 *
 *   1. Beyaz liste regex: sadece kucuk harf, rakam ve tek tire kabul.
 *   2. encodeURIComponent: kalan her sey URL icinde kacisli hale gelir.
 *
 * Tek katman yeterli degil; ikisi birlikte kullanilir.
 */

// pikachu, mr-mime, nidoran-f, deoxys-attack ... hepsi bu kalibi saglar.
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_NAME_LENGTH = 50;
const MAX_POKEMON_ID = 100000;

/**
 * Pokemon adi veya id'sini dogrular ve normalize eder.
 * @returns {string} PokeAPI yoluna guvenle konabilecek deger
 */
function parsePokemonIdentifier(raw) {
  const value = String(raw ?? '').trim().toLowerCase();

  if (!value) {
    throw ApiError.badRequest('Pokemon adi veya id belirtilmeli.', 'IDENTIFIER_REQUIRED');
  }

  if (value.length > MAX_NAME_LENGTH) {
    throw ApiError.badRequest('Pokemon adi cok uzun.', 'IDENTIFIER_TOO_LONG');
  }

  // Sayisal id
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    if (id < 1 || id > MAX_POKEMON_ID) {
      throw ApiError.badRequest('Pokemon id degeri gecersiz.', 'INVALID_ID');
    }
    return String(id);
  }

  if (!NAME_PATTERN.test(value)) {
    throw ApiError.badRequest(
      'Pokemon adi sadece kucuk harf, rakam ve tire icerebilir.',
      'INVALID_IDENTIFIER'
    );
  }

  return value;
}

/** Tur adi ('fire', 'electric' ...) dogrulamasi. */
function parseTypeName(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return null;

  if (value.length > 30 || !/^[a-z-]+$/.test(value)) {
    throw ApiError.badRequest('Gecersiz tur adi.', 'INVALID_TYPE');
  }
  return value;
}

/** Serbest metin arama terimi - disari gitmez, sadece bellekte filtreler. */
function parseSearchTerm(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return null;

  if (value.length > MAX_NAME_LENGTH) {
    throw ApiError.badRequest('Arama terimi cok uzun.', 'SEARCH_TOO_LONG');
  }
  return value;
}

/**
 * Sayfalama parametreleri.
 * limit'e ust sinir koymak onemli: yoksa biri ?limit=999999 ile
 * sunucuyu kilitleyebilir.
 */
function parsePagination(query, { detailed = false } = {}) {
  const { defaultLimit, maxLimit, maxDetailedLimit } = config.pagination;
  const ceiling = detailed ? maxDetailedLimit : maxLimit;

  let limit = Number.parseInt(query.limit, 10);
  if (!Number.isFinite(limit)) limit = Math.min(defaultLimit, ceiling);
  if (limit < 1) {
    throw ApiError.badRequest('limit en az 1 olmali.', 'INVALID_LIMIT');
  }
  if (limit > ceiling) {
    throw ApiError.badRequest(`limit en fazla ${ceiling} olabilir.`, 'LIMIT_TOO_LARGE');
  }

  let offset = Number.parseInt(query.offset, 10);
  if (!Number.isFinite(offset)) offset = 0;
  if (offset < 0) {
    throw ApiError.badRequest('offset negatif olamaz.', 'INVALID_OFFSET');
  }

  return { limit, offset };
}

/** '1', 'true', 'yes' -> true. Diger her sey false. */
function parseBoolean(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

module.exports = {
  parsePokemonIdentifier,
  parseTypeName,
  parseSearchTerm,
  parsePagination,
  parseBoolean,
};
