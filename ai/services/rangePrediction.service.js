const { estimateRangeKm } = require('../../utils/geo');
const {
  trafficMultiplier,
  weatherMultiplier,
  speedConsumptionFactor,
} = require('../utils/conditionMultipliers');
const {
  usableEnergyKwh,
  estimatedRangeKmAdjusted,
  safeTravelDistanceKm,
  estimatedDrainPercentForDistance,
} = require('../utils/batteryCalculations');
const aiConfig = require('../config/ai.config');

function predictRangeFromUser(user, kwhPer100km = aiConfig.defaultKwhPer100km) {
  const km = estimateRangeKm(user.currentBatteryPercent, user.batteryCapacityKwh, kwhPer100km);
  const pct = Number(user.currentBatteryPercent) || 0;
  let batteryBand = 'healthy';
  if (pct <= 10) batteryBand = 'critical';
  else if (pct <= 20) batteryBand = 'low';
  else if (pct <= 35) batteryBand = 'moderate';

  const usableKwh = (pct / 100) * Number(user.batteryCapacityKwh || 0);

  return {
    estimatedRangeKm: Math.round(km * 10) / 10,
    usableEnergyKwh: Math.round(usableKwh * 100) / 100,
    batteryBand,
    assumptions: {
      kwhPer100km,
      batteryPercent: user.currentBatteryPercent,
      batteryCapacityKwh: user.batteryCapacityKwh,
    },
    confidence: 0.72,
    model: 'heuristic_v1',
    note: 'Demo estimate from pack size and efficiency; integrate telematics / OEM APIs for production.',
  };
}

/**
 * Rich range prediction for POST /api/ai/predict-range
 */
function predictRangeWithTelemetry(input) {
  const {
    batteryPercentage,
    vehicleBatteryCapacityKwh,
    currentSpeedKmh = 70,
    trafficConditions = 'light',
    weatherConditions = 'clear',
    kwhPer100km = aiConfig.defaultKwhPer100km,
    referenceDistanceKm = 100,
    reservePercent = 12,
  } = input;

  const factors = [
    trafficMultiplier(trafficConditions),
    weatherMultiplier(weatherConditions),
    speedConsumptionFactor(currentSpeedKmh),
  ];

  const estimatedRemainingDistanceKm =
    Math.round(estimatedRangeKmAdjusted(batteryPercentage, vehicleBatteryCapacityKwh, kwhPer100km, factors) * 10) /
    10;

  const estimatedBatteryDrainPercent = Math.round(
    estimatedDrainPercentForDistance(
      batteryPercentage,
      vehicleBatteryCapacityKwh,
      referenceDistanceKm,
      kwhPer100km,
      factors
    ) * 10
  ) / 10;

  const safeTravelDistanceKmVal =
    Math.round(
      safeTravelDistanceKm(batteryPercentage, vehicleBatteryCapacityKwh, kwhPer100km, factors, reservePercent) * 10
    ) / 10;

  return {
    estimatedRemainingDistanceKm,
    estimatedBatteryDrainPercent,
    referenceDistanceKm,
    safeTravelDistanceKm: safeTravelDistanceKmVal,
    usableEnergyKwh: Math.round(usableEnergyKwh(batteryPercentage, vehicleBatteryCapacityKwh) * 100) / 100,
    assumptions: {
      kwhPer100km,
      trafficConditions,
      weatherConditions,
      currentSpeedKmh,
      reservePercent,
      effectiveKwhPer100km: Math.round(
        (kwhPer100km * factors.reduce((a, b) => a * b, 1)) * 100
      ) / 100,
    },
    confidence: 0.68,
    model: 'mock_physics_v1',
  };
}

module.exports = {
  predictRangeFromUser,
  predictRangeWithTelemetry,
};
