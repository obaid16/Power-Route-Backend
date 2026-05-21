const { haversineKm, tripViaDetourKm } = require('../../utils/geo');
const stationService = require('../../services/stationService');
const { scoreStationHeuristic, buildReasons } = require('../utils/stationScoring');
const { trafficMultiplier } = require('../utils/conditionMultipliers');
const { estimatedDrainPercentForDistance } = require('../utils/batteryCalculations');
const aiConfig = require('../config/ai.config');

function scoreStation(station, user, distanceKm) {
  return scoreStationHeuristic({
    distanceKm,
    userChargerType: user.chargerType,
    stationChargerTypes: station.chargerTypes || [],
    ratingAvg: station.ratings?.average,
    availableSlots: station.slotAvailability?.availableSlots ?? 0,
  });
}

function buildReasonsForDb(station, user, distanceKm) {
  return buildReasons({
    distanceKm,
    userChargerType: user.chargerType,
    stationChargerTypes: station.chargerTypes || [],
    ratingAvg: station.ratings?.average,
    availableSlots: station.slotAvailability?.availableSlots ?? 0,
  });
}

/**
 * Smart station ranking with optional trip-aware scoring (destination reduces score for large detours).
 */
async function recommendStations(user, lat, lng, radiusKm, trip = null) {
  const raw = await stationService.findNearbyStations(lat, lng, radiusKm);
  const withDist = stationService.attachDistanceKm(raw, lat, lng);
  const hasDest =
    trip &&
    trip.destinationLat != null &&
    trip.destinationLng != null &&
    !Number.isNaN(Number(trip.destinationLat)) &&
    !Number.isNaN(Number(trip.destinationLng));

  const ranked = withDist
    .map((s) => {
      const [slng, slat] = s.location.coordinates;
      let matchScore = scoreStation(s, user, s.distanceKm);
      let tripDetourKm = null;
      if (hasDest) {
        tripDetourKm =
          Math.round(
            tripViaDetourKm(lat, lng, Number(trip.destinationLat), Number(trip.destinationLng), slat, slng) * 100
          ) / 100;
        matchScore = Math.max(0, matchScore - Math.min(28, tripDetourKm * 1.8));
        matchScore = Math.round(matchScore * 10) / 10;
      }
      const reasons = buildReasonsForDb(s, user, s.distanceKm);
      if (hasDest && tripDetourKm < 5) {
        reasons.push('Reasonably on the way to your destination');
      }
      return {
        station: s,
        distanceKm: s.distanceKm,
        matchScore,
        reasons,
        ...(tripDetourKm != null ? { tripDetourKm } : {}),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
  return ranked.slice(0, 10);
}

function trafficAwareRecommendation(rankedList, trafficDelayMinutes = 0) {
  const urgency = Math.min(1, trafficDelayMinutes / 60);
  const adjusted = rankedList.map((item) => {
    const adjustedScore = Math.max(0, item.matchScore - urgency * 15);
    return {
      ...item,
      matchScore: Math.round(adjustedScore * 10) / 10,
      trafficAdjustment: { trafficDelayMinutes, urgencyFactor: Math.round(urgency * 100) / 100 },
    };
  });
  adjusted.sort((a, b) => b.matchScore - a.matchScore);
  return adjusted;
}

/**
 * Normalize client-supplied station (API recommend-station).
 */
function normalizeClientStation(raw, index) {
  const id = String(raw.id || raw._id || `client-station-${index}`);
  let lat;
  let lng;
  if (raw.lat != null && raw.lng != null) {
    lat = Number(raw.lat);
    lng = Number(raw.lng);
  } else if (raw.location?.coordinates?.length >= 2) {
    lng = Number(raw.location.coordinates[0]);
    lat = Number(raw.location.coordinates[1]);
  }
  return {
    id,
    name: raw.name || raw.stationName || 'Charging station',
    lat,
    lng,
    chargerTypes: raw.chargerTypes || raw.compatibleConnectors || [],
    maxPowerKw: raw.maxPowerKw != null ? Number(raw.maxPowerKw) : null,
    pricePerKwh: raw.pricePerKwh != null ? Number(raw.pricePerKwh) : null,
    ratingsAverage: raw.ratings?.average ?? raw.rating ?? null,
    availableSlots: raw.slotAvailability?.availableSlots ?? raw.availableSlots ?? 0,
    raw,
  };
}

/**
 * Smart recommendation from client-provided POIs + arrival SoC estimate.
 */
function recommendFromNearbyList(input, user) {
  const {
    userLocation,
    batteryPercentage,
    nearbyChargingStations,
    chargerCompatibility,
    trafficConditions = 'light',
    kwhPer100km = aiConfig.defaultKwhPer100km,
    vehicleBatteryCapacityKwh,
  } = input;

  const trafficFactor = trafficMultiplier(trafficConditions);

  const userLat = Number(userLocation.lat);
  const userLng = Number(userLocation.lng);
  const compat =
    Array.isArray(chargerCompatibility) ? chargerCompatibility : chargerCompatibility ? [chargerCompatibility] : [];

  const packKwh =
    vehicleBatteryCapacityKwh != null ? Number(vehicleBatteryCapacityKwh) : Number(user.batteryCapacityKwh) || 60;

  const scored = nearbyChargingStations
    .map((raw, i) => {
      const s = normalizeClientStation(raw, i);
      const distanceKm =
        s.lat != null && s.lng != null && !Number.isNaN(s.lat) && !Number.isNaN(s.lng)
          ? Math.round(haversineKm(userLat, userLng, s.lat, s.lng) * 100) / 100
          : null;

      const userCharger = user.chargerType || compat[0] || '';
      const matchScore =
        distanceKm == null
          ? 0
          : scoreStationHeuristic({
              distanceKm,
              userChargerType: userCharger,
              stationChargerTypes: s.chargerTypes,
              ratingAvg: s.ratingsAverage,
              availableSlots: s.availableSlots,
            });

      const drainToStation =
        distanceKm == null
          ? 100
          : estimatedDrainPercentForDistance(
              batteryPercentage,
              packKwh,
              distanceKm,
              kwhPer100km,
              [trafficFactor]
            );
      const arrivalPct =
        distanceKm == null ? 0 : Math.max(0, Math.round((batteryPercentage - drainToStation) * 10) / 10);

      const price = s.pricePerKwh ?? aiConfig.defaultPricePerKwh;
      const energyToFull = ((100 - arrivalPct) / 100) * packKwh;
      const chargingCostEstimate = Math.round(energyToFull * price * 100) / 100;

      return {
        station: s,
        distanceKm,
        matchScore,
        estimatedArrivalBatteryPercent: arrivalPct,
        chargingCostEstimate,
        currency: 'LOCAL_UNITS',
        reasons:
          distanceKm == null
            ? ['Missing coordinates for this POI; skipped in ranking']
            : buildReasons({
                distanceKm,
                userChargerType: userCharger,
                stationChargerTypes: s.chargerTypes,
                ratingAvg: s.ratingsAverage,
                availableSlots: s.availableSlots,
              }),
      };
    })
    .filter((row) => row.distanceKm != null);

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const best = scored[0] || null;
  const backup = scored[1] || null;

  return {
    bestChargingStation: best,
    backupChargingStation: backup,
    ranked: scored.slice(0, 8),
  };
}

/**
 * If the client omits POIs, pull nearby stations from Power Route and rank them the same way.
 */
async function recommendStationResolved(input, user) {
  const { userLocation, batteryPercentage, nearbyChargingStations, radiusKm = 25 } = input;
  let list = nearbyChargingStations;
  if (!Array.isArray(list) || list.length === 0) {
    const lat = Number(userLocation.lat);
    const lng = Number(userLocation.lng);
    const raw = await stationService.findNearbyStations(lat, lng, radiusKm);
    list = raw.map((s) => ({
      id: s._id,
      stationName: s.stationName,
      location: s.location,
      chargerTypes: s.chargerTypes,
      maxPowerKw: s.chargingSpeedKw,
      pricePerKwh: s.pricing?.perKwh,
      ratings: s.ratings,
      slotAvailability: s.slotAvailability,
    }));
  }
  return recommendFromNearbyList({ ...input, nearbyChargingStations: list }, user);
}

module.exports = {
  recommendStations,
  trafficAwareRecommendation,
  normalizeClientStation,
  recommendFromNearbyList,
  recommendStationResolved,
};
