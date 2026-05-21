const catchAsync = require('../../utils/catchAsync');
const stationService = require('../../services/stationService');
const { aiSuccess } = require('../utils/apiResponse');
const { optimizeRoutesAi, optimizeRoutePlan } = require('../services/routeOptimization.service');
const aiConfig = require('../config/ai.config');

const optimizeRoute = catchAsync(async (req, res) => {
  const currentLocation = {
    lat: Number(req.body.currentLocation.lat),
    lng: Number(req.body.currentLocation.lng),
  };
  const destination = {
    lat: Number(req.body.destination.lat),
    lng: Number(req.body.destination.lng),
  };
  const batteryPercentage =
    req.body.batteryPercentage != null ? Number(req.body.batteryPercentage) : Number(req.user.currentBatteryPercent);

  const syntheticUser = {
    ...(typeof req.user.toObject === 'function' ? req.user.toObject() : req.user),
    currentBatteryPercent: batteryPercentage,
  };

  const midLat = (currentLocation.lat + destination.lat) / 2;
  const midLng = (currentLocation.lng + destination.lng) / 2;
  const stations = await stationService.findNearbyStations(midLat, midLng, 80);
  const plan = optimizeRoutePlan(syntheticUser, currentLocation, destination, stations);
  const variants = optimizeRoutesAi(
    {
      currentLocation,
      destination,
      batteryPercentage,
      trafficConditions: req.body.trafficConditions,
    },
    syntheticUser
  );

  return aiSuccess(
    res,
    200,
    'route_optimization',
    {
      optimizationPlan: plan.optimization,
      routeWithStop: plan.route,
      safestRoute: variants.safestRoute,
      fastestRoute: variants.fastestRoute,
      batteryEfficientRoute: variants.batteryEfficientRoute,
      baseline: {
        straightLineBaselineKm: variants.straightLineBaselineKm,
        estimatedRangeKm: variants.estimatedRangeKm,
        trafficConditions: variants.trafficConditions,
      },
      note: variants.note,
    },
    { provider: aiConfig.provider }
  );
});

module.exports = { optimizeRoute };
