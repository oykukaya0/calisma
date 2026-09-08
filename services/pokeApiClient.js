'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * PokeAPI ile konusan alt seviye HTTP istemcisi.
 *
 * Bu katman SADECE "istegi at, guvenli sekilde JSON dondur" isini yapar.
 * Veriyi sekillendirmek pokemonService'in isi. Bu ayrim onemli:
 * ilerde PokeAPI degisirse ya da baska bir kaynak eklerseniz
 * sadece bu dosyayi degistirirsiniz.
 *
 * Cozdugu uc gercek problem:
 *
 * 1) TIMEOUT - fetch varsayilan olarak SONSUZA KADAR bekler. PokeAPI takilirsa
 *    sunucunuzun baglantilari birer birer tukenir. AbortController ile kesiyoruz.
 *
 * 2) RETRY - agdaki anlik bir hicki yuzunden kullaniciya hata donmek gereksiz.
 *    Ama sadece GECICI hatalarda tekrar deniyoruz. 404'u tekrar denemek
 *    anlamsizdir, sadece PokeAPI'yi mesgul eder.
 *
 * 3) BACKOFF + JITTER - her denemede bekleme suresi katlanir, uzerine rastgele
 *    bir sapma eklenir. Jitter olmazsa tum istekler ayni anda tekrar dener
 *    ve dis servisi ayni anda vurur (thundering herd).
 */

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt) {
  const base = config.pokeapi.retryBaseDelayMs * 2 ** attempt;
  const jitter = Math.random() * config.pokeapi.retryBaseDelayMs;
  return base + jitter;
}

/**
 * PokeAPI'den JSON ceker.
 * @param {string} path '/pokemon/pikachu' gibi, basinda slash ile
 * @returns {Promise<object>}
 */
async function get(path) {
  const url = `${config.pokeapi.baseUrl}${path}`;
  const maxRetries = config.pokeapi.retries;

  let lastError = ApiError.badGateway('PokeAPI istegi basarisiz oldu.');

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.pokeapi.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'pokemon-team-builder/1.0',
        },
      });

      // 404 kalici bir cevaptir - tekrar denemeden hemen firlat.
      if (response.status === 404) {
        throw ApiError.notFound('Aradiginiz Pokemon bulunamadi.', 'POKEMON_NOT_FOUND');
      }

      if (!response.ok) {
        const error = RETRYABLE_STATUS.has(response.status)
          ? ApiError.badGateway(`PokeAPI gecici hata dondu (${response.status}).`, 'UPSTREAM_RETRYABLE')
          : ApiError.badGateway(`PokeAPI beklenmeyen yanit dondu (${response.status}).`, 'UPSTREAM_ERROR');

        if (!RETRYABLE_STATUS.has(response.status)) throw error;

        lastError = error;
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        throw error;
      }

      return await response.json();
    } catch (error) {
      // Bilinen kalici hatalari oldugu gibi yukari gonder.
      if (error instanceof ApiError && error.code === 'POKEMON_NOT_FOUND') throw error;
      if (error instanceof ApiError && error.code === 'UPSTREAM_ERROR') throw error;

      if (error.name === 'AbortError') {
        lastError = ApiError.gatewayTimeout(
          'PokeAPI zamaninda yanit vermedi, lutfen tekrar deneyin.',
          'UPSTREAM_TIMEOUT'
        );
      } else if (!(error instanceof ApiError)) {
        // Ag hatasi, DNS hatasi, bozuk JSON vb.
        lastError = ApiError.badGateway(
          "PokeAPI'ye su anda ulasilamiyor.",
          'UPSTREAM_UNAVAILABLE'
        );
      } else {
        lastError = error;
      }

      if (attempt < maxRetries) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

module.exports = { get };
