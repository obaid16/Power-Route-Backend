const { body } = require('express-validator');

const vehicleSaveRules = [
  body('evVehicleModel').optional().trim().isLength({ max: 120 }),
  body('batteryCapacityKwh').optional().isFloat({ min: 0 }),
  body('chargerType').optional().trim().isLength({ max: 80 }),
];

const batteryUpdateRules = [
  body('currentBatteryPercent')
    .isFloat({ min: 0, max: 100 })
    .withMessage('currentBatteryPercent must be between 0 and 100'),
];

module.exports = { vehicleSaveRules, batteryUpdateRules };
