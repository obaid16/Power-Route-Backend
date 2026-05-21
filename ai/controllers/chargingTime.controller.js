const catchAsync = require('../../utils/catchAsync');
const { aiSuccess } = require('../utils/apiResponse');
const { estimateChargingSession } = require('../services/chargingTime.service');
const aiConfig = require('../config/ai.config');

const estimateCharging = catchAsync(async (req, res) => {
  const out = estimateChargingSession({
    chargerType: req.body.chargerType,
    batteryCapacityKwh: Number(req.body.batteryCapacityKwh),
    currentBatteryPercent: Number(req.body.currentBatteryPercent),
    targetBatteryPercent: Number(req.body.targetBatteryPercent),
    pricePerKwh: req.body.pricePerKwh != null ? Number(req.body.pricePerKwh) : undefined,
  });
  return aiSuccess(res, 200, 'charging_time_estimation', out, { provider: aiConfig.provider });
});

module.exports = { estimateCharging };
