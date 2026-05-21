const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.use(protect);

router.get('/charging-history', analyticsController.chargingHistory);
router.get('/energy', analyticsController.energyUsage);
router.get('/eco-score', analyticsController.ecoScore);
router.get('/costs', analyticsController.costTracking);

module.exports = router;
