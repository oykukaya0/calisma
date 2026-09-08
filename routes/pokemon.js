'use strict';

const express = require('express');

const pokemonService = require('../services/pokemonService');
const {
  parsePokemonIdentifier,
  parseTypeName,
  parseSearchTerm,
  parsePagination,
  parseBoolean,
} = require('../utils/validators');

const router = express.Router();

/**
 * Route katmani sadece uc is yapar:
 *   1. Girdiyi dogrula (validators)
 *   2. Servisi cagir (pokemonService)
 *   3. Cevabi don
 *
 * Is mantigi buraya YAZILMAZ. Route'lar ince kalirsa test etmesi
 * ve okumasi kolay olur.
 *
 * NOT: Express 5 async fonksiyonlardaki hatalari otomatik olarak
 * hata yakalayiciya iletir. Bu yuzden her yere try/catch yazmaya
 * gerek yok - firlatilan ApiError dogrudan errorHandler'a duser.
 */

// Statik yollar parametreli yollardan ONCE tanimlanmali.
// Yoksa '/types' istegi '/:identifier' ile eslesir ve
// 'types' adinda bir pokemon aranir.

/**
 * GET /api/pokemon/types
 * Filtre menusu icin tum turler.
 */
router.get('/types', async (req, res) => {
  const types = await pokemonService.getTypes();
  res.json({ count: types.length, results: types });
});

/**
 * GET /api/pokemon
 * Kart listesi.
 *
 * Query parametreleri:
 *   limit    (varsayilan 20, max 100 / detailed ise 30)
 *   offset   (varsayilan 0)
 *   search   isimde gecen metne gore filtre (orn: 'char')
 *   type     tur filtresi (orn: 'fire')
 *   detailed 'true' ise her kartin tam detayi doner
 */
router.get('/', async (req, res) => {
  const detailed = parseBoolean(req.query.detailed);
  const { limit, offset } = parsePagination(req.query, { detailed });
  const search = parseSearchTerm(req.query.search);
  const type = parseTypeName(req.query.type);

  const data = await pokemonService.getPokemonList({ limit, offset, search, type, detailed });
  res.json(data);
});

/**
 * GET /api/pokemon/:identifier
 * Tek pokemonun detayi. Ad ya da id ile calisir: /pikachu veya /25
 *
 * ?include=species eklenirse aciklama metni de doner (detay sayfasi icin).
 */
router.get('/:identifier', async (req, res) => {
  const identifier = parsePokemonIdentifier(req.params.identifier);
  const includeSpecies = String(req.query.include || '')
    .split(',')
    .map((item) => item.trim())
    .includes('species');

  const pokemon = await pokemonService.getPokemonDetail(identifier);

  if (!includeSpecies) {
    return res.json(pokemon);
  }

  // Species cagrisi basarisiz olursa ana veriyi yine de donduruyoruz.
  try {
    const species = await pokemonService.getPokemonSpecies(String(pokemon.id));
    return res.json({ ...pokemon, species });
  } catch {
    return res.json({ ...pokemon, species: null });
  }
});

/**
 * GET /api/pokemon/:identifier/species
 * Sadece aciklama/tur bilgisi.
 */
router.get('/:identifier/species', async (req, res) => {
  const identifier = parsePokemonIdentifier(req.params.identifier);
  const species = await pokemonService.getPokemonSpecies(identifier);
  res.json(species);
});

module.exports = router;
