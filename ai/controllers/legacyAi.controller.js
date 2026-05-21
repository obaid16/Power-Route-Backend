const catchAsync = require('../../utils/catchAsync');
const stationService = require('../../services/stationService');
const stationRecommendation = require('../services/stationRecommendation.service');
const rangePrediction = require('../services/rangePrediction.service');
const routeOptimization = require('../services/routeOptimization.service');
const emergencyDetection = require('../services/emergencyDetection.service');
const emergencyService = require('../../services/emergencyService');
const aiConfig = require('../config/ai.config');

const recommend = catchAsync(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const radiusKm = req.body.radiusKm != null ? Number(req.body.radiusKm) : stationService.DEFAULT_RADIUS_KM;
  const trip =
    req.body.destinationLat != null && req.body.destinationLng != null
      ? { destinationLat: Number(req.body.destinationLat), destinationLng: Number(req.body.destinationLng) }
      : null;
  const ranked = await stationRecommendation.recommendStations(req.user, lat, lng, radiusKm, trip);
  res.status(200).json({
    status: 'success',
    data: {
      kind: 'smart_charging_recommendation',
      tripAware: Boolean(trip),
      recommendations: ranked,
    },
  });
});

const rangePredictionLegacy = catchAsync(async (req, res) => {
  const kwhPer100km = req.body.kwhPer100km != null ? Number(req.body.kwhPer100km) : aiConfig.defaultKwhPer100km;
  const prediction = rangePrediction.predictRangeFromUser(req.user, kwhPer100km);
  res.status(200).json({
    status: 'success',
    data: { kind: 'battery_range_prediction', prediction },
  });
});

const bestRoute = catchAsync(async (req, res) => {
  const { origin, destination } = req.body;
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const stations = await stationService.findNearbyStations(midLat, midLng, 80);
  const payload = routeOptimization.optimizeRoutePlan(req.user, origin, destination, stations);
  res.status(200).json({
    status: 'success',
    data: { kind: 'route_optimization', ...payload },
  });
});

const trafficCharging = catchAsync(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const trafficDelayMinutes =
    req.body.trafficDelayMinutes != null ? Number(req.body.trafficDelayMinutes) : 0;
  const radiusKm = req.body.radiusKm != null ? Number(req.body.radiusKm) : stationService.DEFAULT_RADIUS_KM;
  const ranked = await stationRecommendation.recommendStations(req.user, lat, lng, radiusKm);
  const adjusted = stationRecommendation.trafficAwareRecommendation(ranked, trafficDelayMinutes);
  res.status(200).json({
    status: 'success',
    data: {
      kind: 'traffic_aware_charging',
      trafficDelayMinutes,
      recommendations: adjusted,
    },
  });
});

const lowBatteryDetect = catchAsync(async (req, res) => {
  const lat = req.body.lat != null ? Number(req.body.lat) : null;
  const lng = req.body.lng != null ? Number(req.body.lng) : null;
  const createAlert = Boolean(req.body.createAlert);

  const analysis = await emergencyDetection.analyzeLowBatteryEmergency(req.user, lat, lng);
  let alert = null;
  if (createAlert && analysis.level !== 'normal' && lat != null && lng != null) {
    alert = await emergencyService.createAlert(
      req.user._id,
      'low_battery',
      lat,
      lng,
      `AI low-battery detection (${analysis.level}): ${analysis.currentBatteryPercent}%`
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      kind: 'low_battery_emergency_detection',
      ...analysis,
      alert,
    },
  });
});

module.exports = {
  recommend,
  rangePredictionLegacy,
  bestRoute,
  trafficCharging,
  lowBatteryDetect,
};
