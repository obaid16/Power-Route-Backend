const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { aiSuccess } = require('../utils/apiResponse');
const { computeEcoScoreForUser } = require('../services/ecoScore.service');
const aiConfig = require('../config/ai.config');

const ecoScore = catchAsync(async (req, res) => {
  if (String(req.params.userId) !== String(req.user._id)) {
    throw new AppError('You can only access your own eco score', 403);
  }
  const score = await computeEcoScoreForUser(req.params.userId);
  if (!score) {
    throw new AppError('User not found', 404);
  }
  return aiSuccess(res, 200, 'eco_score', { eco: score }, { provider: aiConfig.provider });
});

module.exports = { ecoScore };
