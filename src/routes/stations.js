const express = require('express');
const { getNearby, getDetails, getAvailability, createStation, updateStation, deleteStation, filterByCharger, listAll } = require('../controllers/stationController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { query, param, body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Public routes
router.get('/nearby',
  [query('lat').isFloat(), query('lng').isFloat(), query('radiusKm').optional().isFloat({ min: 0.5, max: 100 })],
  validate, optionalAuth, getNearby
);
router.get('/filter', filterByCharger);
router.get('/:id/availability', [param('id').isMongoId()], validate, getAvailability);
router.get('/:id', [param('id').isMongoId()], validate, getDetails);

// Admin / StationOwner
router.get('/', protect, authorize('admin'), listAll);
router.post('/', protect, authorize('admin', 'stationOwner'), [body('stationName').notEmpty(), body('location.coordinates').isArray({ min: 2, max: 2 })], validate, createStation);
router.patch('/:id', protect, authorize('admin', 'stationOwner'), [param('id').isMongoId()], validate, updateStation);
router.delete('/:id', protect, authorize('admin'), [param('id').isMongoId()], validate, deleteStation);

module.exports = router;
