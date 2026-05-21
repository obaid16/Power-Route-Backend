const express = require('express');
const { protect } = require('../../middleware/authMiddleware');
const { validateRequest } = require('../../middleware/validateMiddleware');
const {
  predictRangeRules,
  recommendStationRules,
  optimizeRouteRules,
  emergencyDetectionRules,
  chatRules,
  estimateChargingRules,
  ecoScoreRules,
} = require('../validators/aiFeature.validators');
const {
  recommendRules,
  rangePredictionRules,
  routeRules,
  trafficChargingRules,
  lowBatteryDetectRules,
} = require('../../validators/aiValidator');

const rangePredictionController = require('../controllers/rangePrediction.controller');
const stationRecommendationController = require('../controllers/stationRecommendation.controller');
const routeOptimizationController = require('../controllers/routeOptimization.controller');
const emergencyDetectionController = require('../controllers/emergencyDetection.controller');
const chatAssistantController = require('../controllers/chatAssistant.controller');
const chargingTimeController = require('../controllers/chargingTime.controller');
const ecoScoreController = require('../controllers/ecoScore.controller');
const legacyAiController = require('../controllers/legacyAi.controller');

const router = express.Router();

const { optionalAuth } = require('../../middleware/authMiddleware');
router.use(optionalAuth); // Allow unauthenticated access for AI endpoints (demo)
/* --- New Power Route AI module (REST) --- */
router.post('/predict-range', predictRangeRules, validateRequest, rangePredictionController.predictRange);
router.post(
  '/recommend-station',
  recommendStationRules,
  validateRequest,
  stationRecommendationController.recommendStation
);
router.post('/optimize-route', optimizeRouteRules, validateRequest, routeOptimizationController.optimizeRoute);
router.post(
  '/emergency-detection',
  emergencyDetectionRules,
  validateRequest,
  emergencyDetectionController.emergencyDetection
);
router.post('/chat', chatRules, validateRequest, chatAssistantController.chat);
router.post('/estimate-charging', estimateChargingRules, validateRequest, chargingTimeController.estimateCharging);
router.get('/eco-score/:userId', ecoScoreRules, validateRequest, ecoScoreController.ecoScore);

/* --- Legacy paths (existing mobile / demos) --- */
router.post('/recommend', recommendRules, validateRequest, legacyAiController.recommend);
router.post('/range-prediction', rangePredictionRules, validateRequest, legacyAiController.rangePredictionLegacy);
router.post('/route', routeRules, validateRequest, legacyAiController.bestRoute);
router.post('/route-optimize', routeRules, validateRequest, legacyAiController.bestRoute);
router.post('/traffic-charging', trafficChargingRules, validateRequest, legacyAiController.trafficCharging);
router.post('/low-battery-detect', lowBatteryDetectRules, validateRequest, legacyAiController.lowBatteryDetect);

module.exports = router;
