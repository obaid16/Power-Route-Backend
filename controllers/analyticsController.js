const catchAsync = require('../utils/catchAsync');
const analyticsService = require('../services/analyticsService');

const chargingHistory = catchAsync(async (req, res) => {
  const history = await analyticsService.chargingHistory(req.user._id);
  res.status(200).json({ status: 'success', results: history.length, data: { history } });
});

const energyUsage = catchAsync(async (req, res) => {
  const summary = await analyticsService.energyUsageSummary(req.user._id);
  res.status(200).json({ status: 'success', data: { energy: summary } });
});

const ecoScore = catchAsync(async (req, res) => {
  const score = await analyticsService.ecoScore(req.user._id);
  res.status(200).json({ status: 'success', data: score });
});

const costTracking = catchAsync(async (req, res) => {
  const costs = await analyticsService.costTracking(req.user._id);
  res.status(200).json({ status: 'success', data: { costs } });
});

module.exports = { chargingHistory, energyUsage, ecoScore, costTracking };
