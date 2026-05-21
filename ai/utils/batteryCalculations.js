const { estimateRangeKm } = require('../../utils/geo');

/**
 * Energy remaining in the pack (kWh).
 */
function usableEnergyKwh(batteryPercent, capacityKwh) {
  const p = Number(batteryPercent);
  const c = Number(capacityKwh);
  if (!Number.isFinite(p) || !Number.isFinite(c)) return 0;
  return (Math.min(100, Math.max(0, p)) / 100) * Math.max(0, c);
}

/**
 * Effective kWh/100km after applying dimensionless adjustment factors.
 */
function adjustedConsumptionKwhPer100km(baseKwhPer100km, factors = []) {
  const base = Number(baseKwhPer100km);
  if (!Number.isFinite(base) || base <= 0) return 18;
  const mult = factors.reduce((a, b) => a * (Number.isFinite(b) && b > 0 ? b : 1), 1);
  return base * mult;
}

/**
 * Estimated range (km) with consumption adjustments.
 */
function estimatedRangeKmAdjusted(batteryPercent, capacityKwh, baseKwhPer100km, factors = []) {
  const kwh100 = adjustedConsumptionKwhPer100km(baseKwhPer100km, factors);
  return estimateRangeKm(batteryPercent, capacityKwh, kwh100);
}

/**
 * Distance that can be covered while retaining `reservePercent` of battery (mock linear slice).
 */
function safeTravelDistanceKm(batteryPercent, capacityKwh, baseKwhPer100km, factors = [], reservePercent = 12) {
  const usable = Math.max(0, Number(batteryPercent) - Number(reservePercent));
  return estimatedRangeKmAdjusted(usable, capacityKwh, baseKwhPer100km, factors);
}

/**
 * Approximate % battery used to travel `distanceKm` at current adjusted consumption.
 */
function estimatedDrainPercentForDistance(batteryPercent, capacityKwh, distanceKm, baseKwhPer100km, factors = []) {
  const kwh100 = adjustedConsumptionKwhPer100km(baseKwhPer100km, factors);
  const neededKwh = (Number(distanceKm) / 100) * kwh100;
  const cap = Number(capacityKwh);
  if (!Number.isFinite(cap) || cap <= 0) return 0;
  return Math.min(100, Math.max(0, (neededKwh / cap) * 100));
}

module.exports = {
  usableEnergyKwh,
  adjustedConsumptionKwhPer100km,
  estimatedRangeKmAdjusted,
  safeTravelDistanceKm,
  estimatedDrainPercentForDistance,
};
