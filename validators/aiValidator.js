const { body } = require('express-validator');

const recommendRules = [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('radiusKm').optional().isFloat({ min: 0.5, max: 200 }),
  body('destinationLat').optional().isFloat({ min: -90, max: 90 }),
  body('destinationLng').optional().isFloat({ min: -180, max: 180 }),
  body().custom((_, { req }) => {
    const a = req.body.destinationLat;
    const b = req.body.destinationLng;
    const hasA = a !== undefined && a !== null && a !== '';
    const hasB = b !== undefined && b !== null && b !== '';
    if (hasA !== hasB) {
      throw new Error('destinationLat and destinationLng must both be provided for trip-aware mode');
    }
    return true;
  }),
];

const rangePredictionRules = [
  body('kwhPer100km').optional().isFloat({ min: 5, max: 80 }),
];

const routeRules = [
  body('origin.lat').isFloat({ min: -90, max: 90 }),
  body('origin.lng').isFloat({ min: -180, max: 180 }),
  body('destination.lat').isFloat({ min: -90, max: 90 }),
  body('destination.lng').isFloat({ min: -180, max: 180 }),
];

const trafficChargingRules = [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('trafficDelayMinutes').optional().isFloat({ min: 0, max: 600 }),
];

const lowBatteryDetectRules = [
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
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

module.exports = {
  recommendRules,
  rangePredictionRules,
  routeRules,
  trafficChargingRules,
  lowBatteryDetectRules,
};
