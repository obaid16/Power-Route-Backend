const { body } = require('express-validator');

const sosRules = [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('message').optional().trim().isLength({ max: 500 }),
];

const nearestEmergencyRules = [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
];

const shareLocationRules = [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
];

const lowBatteryRules = [
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

const towingRules = [
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('notes').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  sosRules,
  nearestEmergencyRules,
  shareLocationRules,
  lowBatteryRules,
  towingRules,
};
