const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const emergencyController = require('../controllers/emergencyController');
const { validateRequest } = require('../middleware/validateMiddleware');
const {
  sosRules,
  nearestEmergencyRules,
  shareLocationRules,
  lowBatteryRules,
  towingRules,
} = require('../validators/emergencyValidator');

const router = express.Router();

router.use(protect);

router.post('/sos',            sosRules,            validateRequest, emergencyController.triggerSos);
router.post('/nearest',        nearestEmergencyRules, validateRequest, emergencyController.nearestEmergency);
router.post('/share-location', shareLocationRules,  validateRequest, emergencyController.shareLiveLocation);
router.post('/low-battery',    lowBatteryRules,     validateRequest, emergencyController.lowBattery);
router.post('/towing',         towingRules,         validateRequest, emergencyController.requestTowing);

module.exports = router;
