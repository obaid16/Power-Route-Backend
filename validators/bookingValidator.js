const { body, param } = require('express-validator');

const createBookingRules = [
  body('chargingStationId').isMongoId().withMessage('chargingStationId is required'),
  body('bookingTime').isISO8601().withMessage('bookingTime must be ISO8601 date'),
  body('chargingDurationMinutes')
    .isInt({ min: 5, max: 24 * 60 })
    .withMessage('chargingDurationMinutes 5-1440'),
];

const cancelBookingRules = [param('id').isMongoId().withMessage('Invalid booking id')];

module.exports = { createBookingRules, cancelBookingRules };
