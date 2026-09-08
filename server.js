'use strict';

const app = require('./app');
const config = require('./config');

/**
 * Sunucunun giris noktasi. Tek isi: dinlemeye baslamak ve
 * duzgun sekilde kapanmak.
 *
 * Node 18+ gerekiyor cunku yerlesik fetch kullaniyoruz.
 * Bu kontrolu basta yapmak, sonra anlasilmaz "fetch is not defined"
 * hatasi almaktan iyidir.
 */
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`Node.js 18 veya ustu gerekli. Yuklu surum: ${process.versions.node}`);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log('');
  console.log('  Pokemon Team Builder API');
  console.log(`  Ortam    : ${config.env}`);
  console.log(`  Adres    : http://localhost:${config.port}`);
  console.log(`  Saglik   : http://localhost:${config.port}/api/health`);
  console.log(`  Ornek    : http://localhost:${config.port}/api/pokemon/pikachu`);
  console.log('');
});

/**
 * Graceful shutdown.
 *
 * Ctrl+C'ye basildiginda process aninda olurse, o an islenmekte olan
 * istekler yarida kalir. Once yeni baglanti kabul etmeyi birakip
 * mevcut istekleri bitirmesini bekliyoruz.
 *
 * 10 saniyede kapanmazsa zorla kapatiyoruz - yoksa takilip kalabilir.
 */
function shutdown(signal) {
  console.log(`\n${signal} alindi, sunucu kapatiliyor...`);

  const forceTimer = setTimeout(() => {
    console.error('Zamaninda kapanmadi, zorla sonlandiriliyor.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  server.close((err) => {
    if (err) {
      console.error('Kapanirken hata:', err);
      process.exit(1);
    }
    console.log('Sunucu duzgun sekilde kapandi.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Yakalanmamis hatalari sessizce yutmak yerine logla.
process.on('unhandledRejection', (reason) => {
  console.error('Yakalanmamis promise reddi:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Yakalanmamis istisna:', error);
  shutdown('uncaughtException');
});

module.exports = server;
