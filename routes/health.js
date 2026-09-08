'use strict';

const express = require('express');
const pokemonService = require('../services/pokemonService');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/health
 * Sunucu ayakta mi, cache ne durumda?
 * Sunum sirasinda "backend calisiyor" demenin en hizli yolu.
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    env: config.env,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    cache: pokemonService.cacheStats(),
  });
});

module.exports = router;
