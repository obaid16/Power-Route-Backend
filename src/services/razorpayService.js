/**
 * razorpayService.js — Razorpay Order Creation, Verification, Refunds
 */
const Razorpay = require('razorpay');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

let razorpay;
function getInstance() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.warn(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', message: 'Razorpay keys not configured — payments disabled' }));
      return null;
    }
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
}

/**
 * Create a Razorpay order
 * @param {number} amountINR - Amount in INR (will be converted to paise)
 * @param {string} receipt - Booking/payment reference ID
 * @param {object} notes - Extra metadata
 */
async function createOrder(amountINR, receipt, notes = {}) {
  const rp = getInstance();
  if (!rp) throw new AppError('Payment gateway not configured', 503);

  const amountPaise = Math.round(amountINR * 100);
  const order = await rp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receipt.toString().slice(0, 40),
    notes,
  });
  return order;
}

/**
 * Verify Razorpay payment signature (HMAC-SHA256)
 */
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new AppError('Payment gateway not configured', 503);

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  return expectedSignature === razorpaySignature;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}

/**
 * Process a refund
 */
async function refundPayment(razorpayPaymentId, amountINR = null, notes = {}) {
  const rp = getInstance();
  if (!rp) throw new AppError('Payment gateway not configured', 503);

  const refundParams = { notes };
  if (amountINR !== null) {
    refundParams.amount = Math.round(amountINR * 100);
  }

  const refund = await rp.payments.refund(razorpayPaymentId, refundParams);
  return refund;
}

/**
 * Fetch payment details from Razorpay
 */
async function fetchPayment(razorpayPaymentId) {
  const rp = getInstance();
  if (!rp) throw new AppError('Payment gateway not configured', 503);
  return rp.payments.fetch(razorpayPaymentId);
}

module.exports = { createOrder, verifyPaymentSignature, verifyWebhookSignature, refundPayment, fetchPayment };
