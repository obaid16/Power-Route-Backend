const ChargingStation = require('../models/ChargingStation');
const { haversineKm } = require('../utils/geo');

const DEFAULT_RADIUS_KM = 15;

async function findNearbyStations(lat, lng, radiusKm = DEFAULT_RADIUS_KM) {
  const radiusMeters = radiusKm * 1000;
  return ChargingStation.find({
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  }).lean();
}

async function findNearbyByChargerType(lat, lng, chargerType, radiusKm = DEFAULT_RADIUS_KM) {
  const stations = await findNearbyStations(lat, lng, radiusKm);
  const needle = chargerType.toLowerCase();
  return stations.filter((s) =>
    (s.chargerTypes || []).some((c) => String(c).toLowerCase().includes(needle))
  );
}

function attachDistanceKm(stations, lat, lng) {
  return stations.map((s) => {
    const [slng, slat] = s.location.coordinates;
    return {
      ...s,
      distanceKm: Math.round(haversineKm(lat, lng, slat, slng) * 100) / 100,
    };
  });
}

async function getStationById(id) {
  return ChargingStation.findById(id).lean();
}

/**
 * Real-time style slot read; optional delta simulates occupancy change for demos.
 */
async function getSlotAvailability(stationId, delta = 0) {
  const station = await ChargingStation.findById(stationId);
  if (!station) return null;
  let available = station.slotAvailability.availableSlots + Number(delta);
  available = Math.max(0, Math.min(station.slotAvailability.totalSlots, available));
  return {
    stationId: String(station._id),
    stationName: station.stationName,
    totalSlots: station.slotAvailability.totalSlots,
    availableSlots: station.slotAvailability.availableSlots,
    projectedAvailableSlots: available,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  findNearbyStations,
  findNearbyByChargerType,
  attachDistanceKm,
  getStationById,
  getSlotAvailability,
  DEFAULT_RADIUS_KM,
};
