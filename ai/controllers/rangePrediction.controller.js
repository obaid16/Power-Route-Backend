const catchAsync = require('../../utils/catchAsync');
const { aiSuccess } = require('../utils/apiResponse');
const { predictRangeWithTelemetry } = require('../services/rangePrediction.service');
const aiConfig = require('../config/ai.config');

const predictRange = catchAsync(async (req, res) => {
  const payload = predictRangeWithTelemetry({
    batteryPercentage: Number(req.body.batteryPercentage),
    vehicleBatteryCapacityKwh: Number(req.body.vehicleBatteryCapacityKwh),
    currentSpeedKmh: req.body.currentSpeedKmh != null ? Number(req.body.currentSpeedKmh) : undefined,
    trafficConditions: req.body.trafficConditions,
    weatherConditions: req.body.weatherConditions,
    kwhPer100km: req.body.kwhPer100km != null ? Number(req.body.kwhPer100km) : aiConfig.defaultKwhPer100km,
    referenceDistanceKm: req.body.referenceDistanceKm != null ? Number(req.body.referenceDistanceKm) : 100,
    reservePercent: req.body.reservePercent != null ? Number(req.body.reservePercent) : 12,
  });
  return aiSuccess(res, 200, 'battery_range_prediction', payload, { provider: aiConfig.provider });
});

module.exports = { predictRange };
