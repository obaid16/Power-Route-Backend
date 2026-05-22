const express = require('express');
const { getWallet, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', getWallet);
router.get('/transactions', getTransactions);
module.exports = router;
