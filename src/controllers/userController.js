/**
 * userController.js — User profile, vehicle management, settings
 */
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

// ── Profile ───────────────────────────────────────────────────────────────────
const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('wallet', 'balanceINR')
    .select('-__v');
  sendSuccess(res, 200, 'Profile fetched.', { user });
});

const updateProfile = catchAsync(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar', 'evVehicleModel', 'batteryCapacityKwh', 'chargerType', 'currentBatteryPercent'];
  const updates = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).populate('wallet', 'balanceINR');
  sendSuccess(res, 200, 'Profile updated.', { user });
});

const updateLocation = catchAsync(async (req, res) => {
  const { coordinates } = req.body; // [lng, lat]
  if (!coordinates || coordinates.length !== 2) throw new AppError('Valid coordinates [lng, lat] required', 400);
  await User.findByIdAndUpdate(req.user._id, { lastKnownLocation: { type: 'Point', coordinates } });
  sendSuccess(res, 200, 'Location updated.');
});

const updateBattery = catchAsync(async (req, res) => {
  const { percent } = req.body;
  if (percent === undefined || percent < 0 || percent > 100) throw new AppError('Valid battery percent (0–100) required', 400);
  await User.findByIdAndUpdate(req.user._id, { currentBatteryPercent: percent });
  sendSuccess(res, 200, 'Battery status updated.', { currentBatteryPercent: percent });
});

// ── Vehicles ──────────────────────────────────────────────────────────────────
const getVehicles = catchAsync(async (req, res) => {
  const vehicles = await Vehicle.find({ user: req.user._id, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
  sendSuccess(res, 200, 'Vehicles fetched.', { vehicles });
});

const addVehicle = catchAsync(async (req, res) => {
  const { isDefault } = req.body;
  if (isDefault) {
    await Vehicle.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const vehicle = await Vehicle.create({ ...req.body, user: req.user._id });
  sendSuccess(res, 201, 'Vehicle added.', { vehicle });
});

const updateVehicle = catchAsync(async (req, res) => {
  if (req.body.isDefault) {
    await Vehicle.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.vehicleId, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  sendSuccess(res, 200, 'Vehicle updated.', { vehicle });
});

const deleteVehicle = catchAsync(async (req, res) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.vehicleId, user: req.user._id },
    { isActive: false },
    { new: true }
  );
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  sendSuccess(res, 200, 'Vehicle removed.');
});

// ── Admin: List Users ─────────────────────────────────────────────────────────
const listUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, isActive } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).skip(skip).limit(parseInt(limit)).select('-password -emailOtp -passwordResetOtp'),
    User.countDocuments(query),
  ]);

  sendPaginated(res, 200, 'Users fetched.', users, { page: parseInt(page), limit: parseInt(limit), total });
});

module.exports = { getProfile, updateProfile, updateLocation, updateBattery, getVehicles, addVehicle, updateVehicle, deleteVehicle, listUsers };
