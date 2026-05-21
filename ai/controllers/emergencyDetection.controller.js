const catchAsync = require('../../utils/catchAsync');
const { aiSuccess } = require('../utils/apiResponse');
const { runEmergencyDetection } = require('../services/emergencyDetection.service');
const emergencyService = require('../../services/emergencyService');
const aiConfig = require('../config/ai.config');

const emergencyDetection = catchAsync(async (req, res) => {
  const lat = req.body.lat != null ? Number(req.body.lat) : null;
  const lng = req.body.lng != null ? Number(req.body.lng) : null;
  const createAlert = Boolean(req.body.createAlert);

  const result = await runEmergencyDetection({
    user: req.user,
    batteryPercentage: req.body.batteryPercentage != null ? Number(req.body.batteryPercentage) : undefined,
    lat,
    lng,
    thresholdPercent: req.body.thresholdPercent != null ? Number(req.body.thresholdPercent) : undefined,
  });

  let alert = null;
  if (createAlert && result.emergencyMode && lat != null && lng != null) {
    alert = await emergencyService.createAlert(
      req.user._id,
      'low_battery',
      lat,
      lng,
      `AI emergency detection: ${result.batteryPercent}% (threshold ${result.thresholdPercent}%)`
    );
  }

  return aiSuccess(
    res,
    200,
    'emergency_low_battery',
    {
      ...result,
      alert,
    },
    { provider: aiConfig.provider }
  );
});

module.exports = { emergencyDetection };
