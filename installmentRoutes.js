const express = require('express');
const { createInstallment, payInstallment, viewMyInstallments } = require('../controllers/installmentController.js');
const { verifyToken, verifyDonor } = require('../controllers/authController.js');

const router = express.Router();

router.use(verifyToken);
router.post('/create', verifyDonor, createInstallment);
router.post('/pay', verifyDonor, payInstallment);
router.get('/mine', verifyDonor, viewMyInstallments);

module.exports = router;
