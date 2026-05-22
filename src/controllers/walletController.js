/**
 * walletController.js — Wallet balance, transactions, history
 */
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

const getWallet = catchAsync(async (req, res) => {
  let wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) wallet = await Wallet.create({ user: req.user._id });
  sendSuccess(res, 200, 'Wallet fetched.', { wallet });
});

const getTransactions = catchAsync(async (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;
  const query = { user: req.user._id };
  if (type) query.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Transaction.countDocuments(query),
  ]);

  sendPaginated(res, 200, 'Transactions fetched.', transactions, {
    page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)),
  });
});

module.exports = { getWallet, getTransactions };
