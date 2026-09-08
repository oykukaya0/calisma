'use strict';

const path = require('node:path');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

/**
 * Express uygulamasi burada KURULUR ama BASLATILMAZ.
 * Baslatma isi server.js'te.
 *
 * Neden ayirdik? Boylece ilerde test yazmak isterseniz app'i
 * import edip gercek bir port acmadan test edebilirsiniz.
 * Ayrica server.js iki kisinin de dokunmayacagi kadar sade kalir.
 *
 * MIDDLEWARE SIRASI ONEMLI - yukaridan asagiya calisir.
 */
const app = express();

// Reverse proxy arkasindaysa (Render, Railway, nginx) gercek IP'yi almak icin.
// Rate limit'in dogru calismasi buna bagli.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- 1. Guvenlik basliklari ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Pokemon gorselleri disaridan geliyor, izin vermemiz gerekiyor.
        imgSrc: ["'self'", 'data:', 'https://raw.githubusercontent.com'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// --- 2. CORS ---
// CORS_ORIGINS bos ise: frontend ayni sunucudan servis ediliyor demektir,
// CORS'a hic gerek yok. Doluysa sadece o adreslere izin veriyoruz.
// Asla origin: '*' kullanmayin - herkesin API'nizi kullanmasina izin verir.
if (config.corsOrigins.length > 0) {
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
      credentials: true,
    })
  );
}

// --- 3. Govde ayristirma ---
// limit onemli: yoksa biri devasa bir JSON yollayip belleginizi doldurabilir.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// --- 4. Sikistirma ve loglama ---
app.use(compression());
app.use(morgan(config.isProd ? 'combined' : 'dev'));

// --- 5. Rate limiting ---
// API'miz PokeAPI'ye vekillik ediyor. Sinir koymazsak biri bizi kullanarak
// PokeAPI'yi doverse IP'miz engellenir. Bu yuzden sinir SART.
app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        message: 'Cok fazla istek gonderdiniz, lutfen biraz bekleyin.',
        code: 'RATE_LIMITED',
        status: 429,
      },
    },
  })
);

// --- 6. Statik dosyalar (Kisi 3'un frontend'i) ---
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: config.isProd ? '1d' : 0,
    extensions: ['html'],
  })
);

// --- 7. API route'lari ---
app.use('/api', routes);

// --- 8. Hata yakalayicilar (HER ZAMAN EN SONDA) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
