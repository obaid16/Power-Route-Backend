/**
 * Shared heuristics for ranking charging locations (DB or client-supplied).
 */

function scoreStationHeuristic({ distanceKm, userChargerType, stationChargerTypes = [], ratingAvg = 0, availableSlots = 0 }) {
  let score = 100 - Math.min(distanceKm * 4, 60);
  const types = stationChargerTypes.map((t) => String(t).toLowerCase());
  const needle = userChargerType ? String(userChargerType).toLowerCase() : '';
  if (needle && types.some((t) => t.includes(needle))) {
    score += 20;
  }
  score += (Number(ratingAvg) || 0) * 4;
  score += Math.min(Number(availableSlots) || 0, 5) * 3;
  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

function buildReasons({ distanceKm, userChargerType, stationChargerTypes = [], ratingAvg = 0, availableSlots = 0 }) {
  const reasons = [];
  if (distanceKm < 3) reasons.push('Very close to your location');
  else if (distanceKm < 8) reasons.push('Within a short drive');
  const types = stationChargerTypes.map((t) => String(t).toLowerCase());
  const needle = userChargerType ? String(userChargerType).toLowerCase() : '';
  if (needle && types.some((t) => t.includes(needle))) {
    reasons.push('Compatible with your charger type');
  }
  if ((Number(ratingAvg) || 0) >= 4) reasons.push('Highly rated by drivers');
  if ((Number(availableSlots) || 0) > 0) reasons.push('Slots available now');
  return reasons;
}

module.exports = { scoreStationHeuristic, buildReasons };
