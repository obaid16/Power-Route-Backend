/**
 * Wallet Model — Virtual currency balance with ledger references
 */
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balanceINR: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    isActive: { type: Boolean, default: true },
    totalDeposited: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    totalRefunded: { type: Number, default: 0, min: 0 },
    lastTransactionAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
