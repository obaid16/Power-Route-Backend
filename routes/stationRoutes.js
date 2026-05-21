const express = require('express');
const stationController = require('../controllers/stationController');
const { validateRequest } = require('../middleware/validateMiddleware');
const {
  nearbyRules,
  stationIdRules,
  filterByChargerRules,
  ocmNearbyRules,
} = require('../validators/stationValidator');

const router = express.Router();

router.get('/nearby', nearbyRules, validateRequest, stationController.getNearby);
router.get('/filter', filterByChargerRules, validateRequest, stationController.filterByCharger);
router.get('/ocm/nearby', ocmNearbyRules, validateRequest, stationController.getOcmNearby);
router.get('/:id/availability', stationIdRules, validateRequest, stationController.getAvailability);
router.get('/:id', stationIdRules, validateRequest, stationController.getDetails);

module.exports = router;
