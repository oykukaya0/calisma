'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Tanimsiz endpoint'ler icin 404.
 * Tum route'lardan SONRA eklenmeli.
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Endpoint bulunamadi: ${req.method} ${req.originalUrl}`, 'ENDPOINT_NOT_FOUND'));
}

/**
 * Merkezi hata yakalayici.
 *
 * Express bir middleware'in 4 parametresi varsa onu hata yakalayici sayar -
 * bu yuzden kullanilmasa bile 'next' parametresi SILINMEMELI.
 *
 * GUVENLIK: Beklenmeyen hatalarin mesaji uretimde kullaniciya gosterilmez.
 * "ER_ACCESS_DENIED_ERROR for user 'root'@'localhost'" gibi bir mesaj
 * saldirgana veritabani hakkinda bilgi verir. Kullaniciya genel mesaj,
 * loga tam detay yaziyoruz.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const isExpected = err.isExpected === true;

  if (!isExpected || status >= 500) {
    console.error(`[HATA] ${req.method} ${req.originalUrl} -> ${status}`);
    console.error(err.stack || err);
  }

  const message =
    isExpected || !config.isProd
      ? err.message
      : 'Sunucuda beklenmeyen bir hata olustu.';

  const body = {
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      status,
    },
  };

  // Stack trace SADECE gelistirme ortaminda.
  if (!config.isProd && !isExpected) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
