const express = require('express');
const { createOrder, verifyPayment, topUpWallet, confirmWalletTopUp, handleWebhook, requestRefund, getHistory } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Webhook — no auth needed (Razorpay calls this directly)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.use(protect);
router.get('/history', getHistory);
router.post('/create-order', [body('bookingId').isMongoId()], validate, createOrder);
router.post('/verify', [
  body('razorpayOrderId').notEmpty(),
  body('razorpayPaymentId').notEmpty(),
  body('razorpaySignature').notEmpty(),
  body('bookingId').isMongoId(),
], validate, verifyPayment);
router.post('/wallet/topup', [body('amountINR').isFloat({ min: 1 })], validate, topUpWallet);
router.post('/wallet/confirm', [body('razorpayOrderId').notEmpty(), body('razorpayPaymentId').notEmpty(), body('razorpaySignature').notEmpty()], validate, confirmWalletTopUp);
router.post('/refund', [body('paymentId').isMongoId()], validate, requestRefund);

module.exports = router;
