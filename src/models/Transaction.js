/**
 * Transaction Model — Detailed ledger logs (deposit, payment, refund)
 */
const mongoose = require('mongoose');

const TX_TYPES = ['deposit', 'payment', 'refund', 'cashback', 'adjustment'];
const TX_STATUS = ['pending', 'completed', 'failed', 'reversed'];

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    type: { type: String, enum: TX_TYPES, required: true },
    status: { type: String, enum: TX_STATUS, default: 'completed' },

    amountINR: { type: Number, required: true },  // positive = credit, negative = debit
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    description: { type: String, trim: true, default: '' },
    reference: { type: String, trim: true, default: '' }, // Razorpay payment/order ID
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ wallet: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.TX_TYPES = TX_TYPES;
module.exports.TX_STATUS = TX_STATUS;
