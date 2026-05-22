/**
 * Payment Model — Razorpay order tracking, signature verification, status lifecycle
 */
const mongoose = require('mongoose');

const PAYMENT_STATUS = ['created', 'captured', 'failed', 'refunded', 'partial_refund'];

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },

    // ── Razorpay ──────────────────────────────────────────────────────────────
    razorpayOrderId: { type: String, unique: true, sparse: true, index: true },
    razorpayPaymentId: { type: String, sparse: true, index: true },
    razorpaySignature: { type: String, select: false },

    // ── Amount ────────────────────────────────────────────────────────────────
    amountINR: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number }, // Razorpay uses paise (1 INR = 100 paise)
    currency: { type: String, default: 'INR' },

    // ── Status ────────────────────────────────────────────────────────────────
    status: { type: String, enum: PAYMENT_STATUS, default: 'created' },
    method: { type: String, default: '' }, // upi, card, netbanking, wallet

    // ── Refund ────────────────────────────────────────────────────────────────
    refundId: { type: String, default: '' },
    refundAmountINR: { type: Number, default: 0 },
    refundReason: { type: String, default: '' },
    refundedAt: { type: Date },

    // ── Invoice ───────────────────────────────────────────────────────────────
    invoiceNumber: { type: String, unique: true, sparse: true },
    invoiceUrl: { type: String, default: '' },

    // ── Meta ──────────────────────────────────────────────────────────────────
    description: { type: String, default: '' },
    capturedAt: { type: Date },
    failureReason: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
