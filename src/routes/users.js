const express = require('express');
const { getProfile, updateProfile, updateLocation, updateBattery, getVehicles, addVehicle, updateVehicle, deleteVehicle, listUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/profile', getProfile);
router.patch('/profile', [body('name').optional().trim().isLength({ max: 100 }), body('currentBatteryPercent').optional().isFloat({ min: 0, max: 100 })], validate, updateProfile);
router.patch('/location', [body('coordinates').isArray({ min: 2, max: 2 })], validate, updateLocation);
router.patch('/battery', [body('percent').isFloat({ min: 0, max: 100 })], validate, updateBattery);

// Vehicles
router.get('/vehicles', getVehicles);
router.post('/vehicles', [body('make').notEmpty(), body('model').notEmpty(), body('batteryCapacityKwh').isFloat({ min: 1 })], validate, addVehicle);
router.patch('/vehicles/:vehicleId', updateVehicle);
router.delete('/vehicles/:vehicleId', deleteVehicle);

// Admin only
router.get('/', authorize('admin'), listUsers);

module.exports = router;
