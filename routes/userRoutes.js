const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getVehicle, saveVehicle, updateBattery } = require('../controllers/userController');
const { validateRequest } = require('../middleware/validateMiddleware');
const { vehicleSaveRules, batteryUpdateRules } = require('../validators/userValidator');

const router = express.Router();

router.use(protect);

router.get('/vehicle', getVehicle);
router.patch('/vehicle', vehicleSaveRules, validateRequest, saveVehicle);
router.patch('/battery', batteryUpdateRules, validateRequest, updateBattery);

module.exports = router;
