'use strict';

/**
 * Beklenen (operasyonel) hatalar icin ozel hata sinifi.
 *
 * Neden gerekli?
 * "Pokemon bulunamadi" ile "kodda null hatasi var" ayni sey degil.
 * Birincisi kullaniciya aynen gosterilebilir, ikincisi gosterilmemeli
 * (ic yapiyi sizdirir). isExpected bayragi bu ayrimi yapmamizi saglar.
 */
class ApiError extends Error {
  /**
   * @param {number} status  HTTP durum kodu
   * @param {string} message Kullaniciya gosterilebilir mesaj
   * @param {string} code    Frontend'in switch/case yapabilecegi sabit kod
   */
  constructor(status, message, code = 'ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isExpected = true;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }

  static notFound(message, code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static tooManyRequests(message, code = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }

  /** Bizim degil, dis servisin hatasi (PokeAPI bozuk cevap dondu). */
  static badGateway(message, code = 'UPSTREAM_ERROR') {
    return new ApiError(502, message, code);
  }

  /** Dis servis zamaninda cevap vermedi. */
  static gatewayTimeout(message, code = 'UPSTREAM_TIMEOUT') {
    return new ApiError(504, message, code);
  }
}

module.exports = ApiError;
