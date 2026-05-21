const { query, param, body } = require('express-validator');

const nearbyRules = [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('lat is required (-90 to 90)'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('lng is required (-180 to 180)'),
  query('radiusKm').optional().isFloat({ min: 0.1, max: 500 }).withMessage('radiusKm 0.1-500'),
];

const stationIdRules = [param('id').isMongoId().withMessage('Invalid station id')];

const filterByChargerRules = [
  query('lat').isFloat({ min: -90, max: 90 }),
  query('lng').isFloat({ min: -180, max: 180 }),
  query('chargerType').trim().notEmpty().withMessage('chargerType is required'),
];

const ocmNearbyRules = [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('lat is required (-90 to 90)'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('lng is required (-180 to 180)'),
  query('distanceKm').optional().isFloat({ min: 0.5, max: 500 }).withMessage('distanceKm 0.5-500'),
  query('maxResults').optional().isInt({ min: 1, max: 200 }).withMessage('maxResults 1-200'),
];

const slotSimulateRules = [
  body('delta').optional().isInt({ min: -100, max: 100 }).withMessage('delta must be an integer'),
];

module.exports = { nearbyRules, stationIdRules, filterByChargerRules, slotSimulateRules, ocmNearbyRules };
