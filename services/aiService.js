/**
 * Facade for modules that still import `services/aiService` (e.g. emergency flows).
 * New code should import from `../ai/services/...` directly.
 */
const stationRecommendation = require('../ai/services/stationRecommendation.service');
const rangePrediction = require('../ai/services/rangePrediction.service');
const routeOptimization = require('../ai/services/routeOptimization.service');
const emergencyDetection = require('../ai/services/emergencyDetection.service');

module.exports = {
  recommendStations: stationRecommendation.recommendStations,
  predictRange: rangePrediction.predictRangeFromUser,
  suggestRoute: routeOptimization.suggestRoute,
  optimizeRoutePlan: routeOptimization.optimizeRoutePlan,
  trafficAwareRecommendation: stationRecommendation.trafficAwareRecommendation,
  analyzeLowBatteryEmergency: emergencyDetection.analyzeLowBatteryEmergency,
};
