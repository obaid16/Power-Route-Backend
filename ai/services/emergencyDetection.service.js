const stationService = require('../../services/stationService');
const { predictRangeFromUser } = require('./rangePrediction.service');
const { recommendStations } = require('./stationRecommendation.service');
const aiConfig = require('../config/ai.config');

/**
 * Low-battery / range risk analysis for AI and emergency flows (no side effects).
 */
async function analyzeLowBatteryEmergency(user, lat, lng) {
  const prediction = predictRangeFromUser(user);
  const pct = Number(user.currentBatteryPercent) || 0;
  let level = 'normal';
  if (pct <= 10 || prediction.estimatedRangeKm < 8) level = 'critical';
  else if (pct <= 20) level = 'emergency';
  else if (pct <= 35) level = 'warning';

  let recommendations = [];
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    recommendations = await recommendStations(user, Number(lat), Number(lng), 25);
  }

  const nearestKm = recommendations[0]?.distanceKm ?? null;
  const cannotReachNearest = nearestKm != null && prediction.estimatedRangeKm < nearestKm * 1.15;

  const guidance = [];
  if (lat == null || lng == null) {
    guidance.push('Share GPS coordinates to rank the nearest compatible chargers.');
  }
  if (level === 'critical' || cannotReachNearest) {
    guidance.push('Reduce speed, turn off cabin HVAC if safe, and head to the closest available charger immediately.');
  } else if (level === 'emergency') {
    guidance.push('Plan a charging stop within the next few kilometers.');
  } else if (level === 'warning') {
    guidance.push('Consider charging soon; range buffer is getting thin.');
  } else {
    guidance.push('Battery state looks comfortable under current heuristics.');
  }

  return {
    level,
    currentBatteryPercent: pct,
    prediction,
    nearestStationDistanceKm: nearestKm,
    rangeInsufficientForNearest: cannotReachNearest,
    recommendations: recommendations.slice(0, 5),
    guidance,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * POST /api/ai/emergency-detection — configurable threshold + structured response.
 */
async function runEmergencyDetection({ user, batteryPercentage, lat, lng, thresholdPercent }) {
  const threshold = thresholdPercent != null ? Number(thresholdPercent) : aiConfig.emergencyBatteryThresholdPercent;
  const pct = batteryPercentage != null ? Number(batteryPercentage) : Number(user.currentBatteryPercent);
  const emergencyMode = pct <= threshold;

  const syntheticUser = { ...(typeof user.toObject === 'function' ? user.toObject() : user), currentBatteryPercent: pct };
  const analysis = await analyzeLowBatteryEmergency(syntheticUser, lat, lng);

  let nearest = analysis.recommendations[0] || null;
  if (!nearest && lat != null && lng != null) {
    const raw = await stationService.findNearbyStations(lat, lng, 30);
    const withDist = stationService.attachDistanceKm(raw, lat, lng);
    nearest = withDist.length
      ? {
          station: withDist[0],
          distanceKm: withDist[0].distanceKm,
          matchScore: 70,
          reasons: ['Nearest station from Power Route directory'],
        }
      : null;
  }

  const failureRisk = Math.min(
    1,
    Math.max(0, (threshold + 12 - pct) / 40 + (analysis.rangeInsufficientForNearest ? 0.35 : 0))
  );

  const emergencyResponse = emergencyMode
    ? `Emergency mode: battery at ${pct}% is at or below the ${threshold}% policy threshold. Navigate to the recommended charger and reduce auxiliary loads if safe.`
    : `Battery at ${pct}% is above the ${threshold}% emergency threshold. Continue monitoring range.`;

  return {
    emergencyMode,
    thresholdPercent: threshold,
    batteryPercent: pct,
    failureRisk: Math.round(failureRisk * 100) / 100,
    nearestChargingRecommendation: nearest,
    emergencyResponse,
    analysis,
  };
}

module.exports = {
  analyzeLowBatteryEmergency,
  runEmergencyDetection,
};
