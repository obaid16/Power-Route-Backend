/**
 * paymentController.js — Razorpay order creation, verification, refunds, webhook
 */
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/responseHelper');
const razorpayService = require('../services/razorpayService');
const { notifyPaymentReceived } = require('../services/notificationService');

// ── Create Razorpay Order ──────────────────────────────────────────────────────
const createOrder = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status === 'active') throw new AppError('Booking already paid', 400);
  if (!['locked', 'pending'].includes(booking.status)) throw new AppError('Booking is not in payable state', 400);

  const amountINR = booking.estimatedCostINR;
  const order = await razorpayService.createOrder(amountINR, booking._id, {
    user_id: req.user._id.toString(),
    booking_id: booking._id.toString(),
  });

  const payment = await Payment.create({
    user: req.user._id,
    booking: booking._id,
    razorpayOrderId: order.id,
    amountINR,
    amountPaise: order.amount,
    status: 'created',
    description: `Charging session booking #${booking._id}`,
  });

  booking.payment = payment._id;
  await booking.save();

  sendSuccess(res, 201, 'Razorpay order created.', {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment._id,
    key: process.env.RAZORPAY_KEY_ID,
  });
});

// ── Verify Payment & Confirm Booking ─────────────────────────────────────────
const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

  const isValid = razorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) throw new AppError('Payment signature verification failed', 400);

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw new AppError('Payment record not found', 404);

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = 'captured';
  payment.capturedAt = new Date();
  await payment.save();

  // Confirm the booking
  const booking = await Booking.findById(bookingId);
  if (booking && booking.status === 'locked') {
    booking.status = 'active';
    booking.paymentStatus = 'paid';
    await booking.save();
  }

  await notifyPaymentReceived(req.user._id, payment, payment.amountINR);

  sendSuccess(res, 200, 'Payment verified and booking confirmed!', {
    payment: { id: payment._id, status: payment.status, amountINR: payment.amountINR },
    booking: { id: booking?._id, status: booking?.status },
  });
});

// ── Wallet Top-up ─────────────────────────────────────────────────────────────
const topUpWallet = catchAsync(async (req, res) => {
  const { amountINR } = req.body;
  if (!amountINR || amountINR < 1) throw new AppError('Invalid amount', 400);

  const order = await razorpayService.createOrder(amountINR, `wallet_${req.user._id}`, {
    type: 'wallet_topup',
    user_id: req.user._id.toString(),
  });

  const payment = await Payment.create({
    user: req.user._id,
    razorpayOrderId: order.id,
    amountINR,
    amountPaise: order.amount,
    status: 'created',
    description: 'Wallet top-up',
  });

  sendSuccess(res, 201, 'Wallet top-up order created.', {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment._id,
    key: process.env.RAZORPAY_KEY_ID,
  });
});

// ── Confirm Wallet Top-up ─────────────────────────────────────────────────────
const confirmWalletTopUp = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const isValid = razorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) throw new AppError('Payment signature verification failed', 400);

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw new AppError('Payment record not found', 404);

  payment.razorpayPaymentId = razorpayPaymentId;
  payment.status = 'captured';
  payment.capturedAt = new Date();
  await payment.save();

  // Credit wallet
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) throw new AppError('Wallet not found', 404);

  const balanceBefore = wallet.balanceINR;
  wallet.balanceINR += payment.amountINR;
  wallet.totalDeposited += payment.amountINR;
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  await Transaction.create({
    user: req.user._id,
    wallet: wallet._id,
    payment: payment._id,
    type: 'deposit',
    status: 'completed',
    amountINR: payment.amountINR,
    balanceBefore,
    balanceAfter: wallet.balanceINR,
    description: 'Wallet top-up via Razorpay',
    reference: razorpayPaymentId,
  });

  sendSuccess(res, 200, 'Wallet topped up successfully!', {
    newBalance: wallet.balanceINR,
    amountAdded: payment.amountINR,
  });
});

// ── Webhook Handler ───────────────────────────────────────────────────────────
const handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = JSON.stringify(req.body);

  const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn(JSON.stringify({ ts: new Date().toISOString(), event: 'webhook_invalid_sig' }));
    return res.status(400).json({ status: 'fail', message: 'Invalid webhook signature' });
  }

  const { event, payload } = req.body;
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'razorpay_webhook', type: event }));

  if (event === 'payment.captured') {
    const razorpayPaymentId = payload?.payment?.entity?.id;
    const razorpayOrderId = payload?.payment?.entity?.order_id;
    if (razorpayPaymentId && razorpayOrderId) {
      await Payment.findOneAndUpdate({ razorpayOrderId }, { status: 'captured', razorpayPaymentId, capturedAt: new Date() });
    }
  }

  if (event === 'refund.processed') {
    const refundId = payload?.refund?.entity?.id;
    const razorpayPaymentId = payload?.refund?.entity?.payment_id;
    if (refundId && razorpayPaymentId) {
      await Payment.findOneAndUpdate({ razorpayPaymentId }, { status: 'refunded', refundId, refundedAt: new Date() });
    }
  }

  res.status(200).json({ status: 'ok' });
});

// ── Request Refund ────────────────────────────────────────────────────────────
const requestRefund = catchAsync(async (req, res) => {
  const { paymentId, reason } = req.body;
  const payment = await Payment.findOne({ _id: paymentId, user: req.user._id });
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== 'captured') throw new AppError('Payment is not eligible for refund', 400);

  const refund = await razorpayService.refundPayment(payment.razorpayPaymentId, payment.amountINR, { reason });
  payment.status = 'refunded';
  payment.refundId = refund.id;
  payment.refundAmountINR = payment.amountINR;
  payment.refundReason = reason;
  payment.refundedAt = new Date();
  await payment.save();

  sendSuccess(res, 200, 'Refund processed successfully.', { refundId: refund.id, amountINR: payment.amountINR });
});

// ── Payment History ───────────────────────────────────────────────────────────
const getHistory = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [payments, total] = await Promise.all([
    Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('booking', 'status scheduledAt station'),
    Payment.countDocuments({ user: req.user._id }),
  ]);
  sendSuccess(res, 200, 'Payment history fetched.', { payments, total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = { createOrder, verifyPayment, topUpWallet, confirmWalletTopUp, handleWebhook, requestRefund, getHistory };
