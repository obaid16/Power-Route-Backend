/**
 * Maps qualitative traffic / weather labels to consumption multipliers (mock physics).
 */

const TRAFFIC = {
  light: 1,
  moderate: 1.08,
  heavy: 1.18,
  severe: 1.28,
};

const WEATHER = {
  clear: 1,
  rain: 1.05,
  snow: 1.15,
  wind: 1.04,
  cold: 1.1,
  hot: 1.08,
  fog: 1.03,
};

function trafficMultiplier(condition) {
  if (condition == null || condition === '') return 1;
  const key = String(condition).toLowerCase();
  return TRAFFIC[key] ?? 1.06;
}

function weatherMultiplier(condition) {
  if (condition == null || condition === '') return 1;
  const key = String(condition).toLowerCase();
  return WEATHER[key] ?? 1.04;
}

/**
 * Speed factor vs a 70 km/h reference (gentle curve).
 * @param {number} speedKmh
 */
function speedConsumptionFactor(speedKmh) {
  const s = Number(speedKmh);
  if (!Number.isFinite(s)) return 1;
  const ref = 70;
  const ratio = Math.max(20, Math.min(180, s)) / ref;
  return 0.85 + 0.35 * (ratio - 1) ** 2 + 0.15 * Math.max(0, ratio - 1.2);
}

module.exports = {
  trafficMultiplier,
  weatherMultiplier,
  speedConsumptionFactor,
  TRAFFIC,
  WEATHER,
};
