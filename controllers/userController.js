const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const { toVehicleProfile } = require('../utils/userMapper');

const getVehicle = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', data: { vehicle: toVehicleProfile(req.user) } });
});

const saveVehicle = catchAsync(async (req, res) => {
  const { evVehicleModel, batteryCapacityKwh, chargerType } = req.body;
  const updates = {};
  if (evVehicleModel !== undefined) updates.evVehicleModel = evVehicleModel;
  if (batteryCapacityKwh !== undefined) updates.batteryCapacityKwh = batteryCapacityKwh;
  if (chargerType !== undefined) updates.chargerType = chargerType;
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json({ status: 'success', data: { vehicle: toVehicleProfile(user) } });
});

const updateBattery = catchAsync(async (req, res) => {
  const { currentBatteryPercent } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { currentBatteryPercent },
    { new: true, runValidators: true }
  );
  res.status(200).json({ status: 'success', data: { vehicle: toVehicleProfile(user) } });
});

module.exports = { getVehicle, saveVehicle, updateBattery };
