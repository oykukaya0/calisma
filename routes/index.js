'use strict';

const express = require('express');

const router = express.Router();

/**
 * TUM route'lar burada birlesir.
 *
 * ==== EKIP ICIN ONEMLI NOT ====
 * app.js'e dokunmayin. Yeni bir endpoint grubu eklerken
 * sadece asagiya TEK SATIR ekleyin.
 *
 * Boylece Kisi 1 ve Kisi 2 ayni dosyanin ayni satirini degistirmez,
 * merge conflict ihtimali neredeyse sifira iner. Conflict cikarsa da
 * tek satirlik olur, 5 saniyede cozulur.
 */

router.use('/health', require('./health'));
router.use('/pokemon', require('./pokemon'));

// Kisi 2 (feature/database) su satirin yorumunu kaldiracak:
 router.use('/team', require('./team'));

module.exports = router;
