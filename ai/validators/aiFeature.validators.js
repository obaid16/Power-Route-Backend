const { body, param } = require('express-validator');

const trafficEnum = ['light', 'moderate', 'heavy', 'severe'];
const weatherEnum = ['clear', 'rain', 'snow', 'wind', 'cold', 'hot', 'fog'];

const predictRangeRules = [
  body('batteryPercentage').isFloat({ min: 0, max: 100 }),
  body('vehicleBatteryCapacityKwh').isFloat({ min: 1, max: 500 }),
  body('currentSpeedKmh').optional().isFloat({ min: 0, max: 220 }),
  body('trafficConditions').optional().isIn(trafficEnum),
  body('weatherConditions').optional().isIn(weatherEnum),
  body('kwhPer100km').optional().isFloat({ min: 5, max: 80 }),
  body('referenceDistanceKm').optional().isFloat({ min: 1, max: 800 }),
  body('reservePercent').optional().isFloat({ min: 0, max: 40 }),
];

const recommendStationRules = [
  body('userLocation.lat').isFloat({ min: -90, max: 90 }),
  body('userLocation.lng').isFloat({ min: -180, max: 180 }),
  body('batteryPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('vehicleBatteryCapacityKwh').optional().isFloat({ min: 1, max: 500 }),
  body('nearbyChargingStations').optional().isArray(),
  body('nearbyChargingStations.*.lat').optional().isFloat({ min: -90, max: 90 }),
  body('nearbyChargingStations.*.lng').optional().isFloat({ min: -180, max: 180 }),
  body('chargerCompatibility').optional(),
  body('trafficConditions').optional().isIn(trafficEnum),
  body('kwhPer100km').optional().isFloat({ min: 5, max: 80 }),
  body('radiusKm').optional().isFloat({ min: 0.5, max: 200 }),
];

const optimizeRouteRules = [
  body('currentLocation.lat').isFloat({ min: -90, max: 90 }),
  body('currentLocation.lng').isFloat({ min: -180, max: 180 }),
  body('destination.lat').isFloat({ min: -90, max: 90 }),
  body('destination.lng').isFloat({ min: -180, max: 180 }),
  body('batteryPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('trafficConditions').optional().isIn(trafficEnum),
];

const emergencyDetectionRules = [
  body('batteryPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
  body('thresholdPercent').optional().isFloat({ min: 1, max: 50 }),
  body('createAlert').optional().isBoolean(),
  body().custom((_, { req }) => {
    if (req.body.createAlert === true || req.body.createAlert === 'true') {
      if (req.body.lat == null || req.body.lng == null) {
        throw new Error('lat and lng are required when createAlert is true');
      }
    }
    return true;
  }),
];

const chatRules = [
  body('message').isString().trim().isLength({ min: 1, max: 4000 }),
  body('context').optional().isString().trim().isLength({ max: 2000 }),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

const estimateChargingRules = [
  body('chargerType').isString().trim().isLength({ min: 1, max: 64 }),
  body('batteryCapacityKwh').isFloat({ min: 1, max: 500 }),
  body('currentBatteryPercent').isFloat({ min: 0, max: 100 }),
  body('targetBatteryPercent').isFloat({ min: 0, max: 100 }),
  body('pricePerKwh').optional().isFloat({ min: 0, max: 10 }),
  body().custom((_, { req }) => {
    const cur = Number(req.body.currentBatteryPercent);
    const tgt = Number(req.body.targetBatteryPercent);
    if (tgt <= cur) {
      throw new Error('targetBatteryPercent must be greater than currentBatteryPercent');
    }
    return true;
  }),
];

const ecoScoreRules = [param('userId').isMongoId()];

module.exports = {
  predictRangeRules,
  recommendStationRules,
  optimizeRouteRules,
  emergencyDetectionRules,
  chatRules,
  estimateChargingRules,
  ecoScoreRules,
  trafficEnum,
  weatherEnum,
};
