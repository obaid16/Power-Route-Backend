const { haversineKm, estimateRangeKm } = require('../../utils/geo');
const { trafficMultiplier } = require('../utils/conditionMultipliers');

function suggestRoute(origin, destination, stations) {
  const mid = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };
  const scored = stations.map((s) => {
    const [lng, slat] = s.location.coordinates;
    const d = haversineKm(mid.lat, mid.lng, slat, lng);
    return { station: s, detourKm: d };
  });
  scored.sort((a, b) => a.detourKm - b.detourKm);
  const stop = scored[0]?.station;
  const waypoints = [
    { type: 'start', lat: origin.lat, lng: origin.lng },
    ...(stop
      ? [
          {
            type: 'charging_stop',
            stationId: String(stop._id),
            name: stop.stationName,
            lat: stop.location.coordinates[1],
            lng: stop.location.coordinates[0],
          },
        ]
      : []),
    { type: 'end', lat: destination.lat, lng: destination.lng },
  ];
  const directKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const detour = stop ? scored[0].detourKm * 2 : 0;
  const totalLegKm = directKm + detour;
  return {
    waypoints,
    suggestedChargingStop: stop || null,
    estimatedTotalDistanceKm: Math.round(totalLegKm * 10) / 10,
    straightLineTripKm: Math.round(directKm * 10) / 10,
    note: 'Straight-line geometry with optional midpoint charging stop; swap in a routing engine for turn-by-turn.',
  };
}

function optimizeRoutePlan(user, origin, destination, stations) {
  const tripKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const estRangeKm = estimateRangeKm(user.currentBatteryPercent, user.batteryCapacityKwh);
  const needsChargingStop = estRangeKm < tripKm * 0.92;
  const route = suggestRoute(origin, destination, stations);
  const guidance = [];
  if (needsChargingStop) {
    guidance.push('Estimated remaining range is below a safe margin for this trip without charging.');
    if (route.suggestedChargingStop) {
      guidance.push('A charging stop near the route midpoint is suggested before continuing.');
    } else {
      guidance.push('No suitable station was found in the search corridor; expand search or adjust the path.');
    }
  } else {
    guidance.push('Estimated range is sufficient for this straight-line trip under current assumptions.');
  }
  return {
    optimization: {
      tripDistanceKm: Math.round(tripKm * 10) / 10,
      estimatedCurrentRangeKm: Math.round(estRangeKm * 10) / 10,
      needsChargingStop,
      safetyMarginFactor: 0.92,
      guidance,
    },
    route,
  };
}

/**
 * Mock three route personas (swap with Mapbox/Google Directions later).
 */
function optimizeRoutesAi(input, user) {
  const { currentLocation, destination, batteryPercentage, trafficConditions = 'light' } = input;
  const origin = { lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) };
  const dest = { lat: Number(destination.lat), lng: Number(destination.lng) };
  const tripKm = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  const tFactor = trafficMultiplier(trafficConditions);
  const pct = batteryPercentage != null ? Number(batteryPercentage) : Number(user.currentBatteryPercent);
  const cap = user.batteryCapacityKwh || 60;
  const baseRange = estimateRangeKm(pct, cap);

  const inflate = (factor, label) => {
    const dist = Math.round(tripKm * factor * tFactor * 10) / 10;
    const timeMin = Math.round(35 + tripKm * 0.85 * factor * tFactor);
    const energyScore = Math.max(0, Math.min(100, Math.round(100 - (factor - 1) * 55 - (tFactor - 1) * 30)));
    return {
      label,
      summary: `${label} profile along the corridor (mock geometry).`,
      distanceKm: dist,
      estimatedTimeMinutes: timeMin,
      energyScore,
      riskScore: Math.round(Math.max(0, 1 - baseRange / (dist * 1.05)) * 100) / 100,
    };
  };

  return {
    straightLineBaselineKm: Math.round(tripKm * 10) / 10,
    estimatedRangeKm: Math.round(baseRange * 10) / 10,
    trafficConditions,
    safestRoute: inflate(1.06, 'Safest'),
    fastestRoute: inflate(1.12, 'Fastest'),
    batteryEfficientRoute: inflate(1.02, 'Battery-efficient'),
    note: 'Scores are heuristic mock values for hackathon demos; integrate a routing engine for polylines and live ETAs.',
  };
}

module.exports = {
  suggestRoute,
  optimizeRoutePlan,
  optimizeRoutesAi,
};
