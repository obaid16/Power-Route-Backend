const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two WGS84 points in kilometers.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Rough remaining range (km) from battery % and usable capacity.
 * Assumes average efficiency kWh/100km for hackathon demo.
 */
function estimateRangeKm(batteryPercent, batteryCapacityKwh, kwhPer100km = 18) {
  if (batteryPercent == null || batteryCapacityKwh == null) return 0;
  const usable = (Number(batteryPercent) / 100) * Number(batteryCapacityKwh);
  return (usable / kwhPer100km) * 100;
}

/** Extra km if routing origin -> station -> destination vs direct origin -> destination. */
function tripViaDetourKm(originLat, originLng, destLat, destLng, stationLat, stationLng) {
  const direct = haversineKm(originLat, originLng, destLat, destLng);
  const leg1 = haversineKm(originLat, originLng, stationLat, stationLng);
  const leg2 = haversineKm(stationLat, stationLng, destLat, destLng);
  return Math.max(0, leg1 + leg2 - direct);
}

module.exports = { haversineKm, estimateRangeKm, tripViaDetourKm, EARTH_RADIUS_KM };
