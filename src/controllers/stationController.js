/**
 * stationController.js — Charging stations: geospatial search, CRUD, availability
 */
const ChargingStation = require('../models/ChargingStation');
const Charger = require('../models/Charger');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');
const { broadcastStationStatus } = require('../services/socketService');

// ── Nearby Stations (Geospatial) ──────────────────────────────────────────────
const getNearby = catchAsync(async (req, res) => {
  const { lat, lng, radiusKm = 10, chargerType, minSpeed, womenSafe, open247, page = 1, limit = 20 } = req.query;
  if (!lat || !lng) throw new AppError('lat and lng are required', 400);

  const radiusMeters = parseFloat(radiusKm) * 1000;
  const query = {
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radiusMeters,
      },
    },
    isActive: true,
  };

  if (chargerType) query.chargerTypes = { $in: [chargerType] };
  if (minSpeed) query.chargingSpeedKw = { $gte: parseFloat(minSpeed) };
  if (womenSafe === 'true') query.womenSafe = true;
  if (open247 === 'true') query.open247 = true;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const stations = await ChargingStation.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

  sendPaginated(res, 200, 'Nearby stations fetched.', stations, {
    page: parseInt(page),
    limit: parseInt(limit),
    total: stations.length,
  });
});

// ── Get Station Details ───────────────────────────────────────────────────────
const getDetails = catchAsync(async (req, res) => {
  const station = await ChargingStation.findById(req.params.id).populate('owner', 'businessName businessPhone');
  if (!station) throw new AppError('Station not found', 404);

  const chargers = await Charger.find({ station: station._id, isActive: true });
  const reviews = await Review.find({ station: station._id, isHidden: false })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(5);

  sendSuccess(res, 200, 'Station details fetched.', { station, chargers, reviews });
});

// ── Get Station Availability ──────────────────────────────────────────────────
const getAvailability = catchAsync(async (req, res) => {
  const chargers = await Charger.find({ station: req.params.id, isActive: true })
    .select('portNumber connectorType maxPowerKw chargingMode status lastStatusChange');

  const summary = {
    total: chargers.length,
    available: chargers.filter((c) => c.status === 'available').length,
    occupied: chargers.filter((c) => c.status === 'occupied').length,
    faulted: chargers.filter((c) => c.status === 'faulted').length,
    offline: chargers.filter((c) => c.status === 'offline').length,
  };

  sendSuccess(res, 200, 'Availability fetched.', { summary, chargers });
});

// ── Create Station (Admin/StationOwner) ───────────────────────────────────────
const createStation = catchAsync(async (req, res) => {
  const stationData = { ...req.body };
  if (!stationData.location?.coordinates) throw new AppError('Location coordinates are required', 400);

  const station = await ChargingStation.create(stationData);
  sendSuccess(res, 201, 'Station created successfully.', { station });
});

// ── Update Station ────────────────────────────────────────────────────────────
const updateStation = catchAsync(async (req, res) => {
  const station = await ChargingStation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!station) throw new AppError('Station not found', 404);

  // Broadcast updated status
  const chargers = await Charger.find({ station: station._id }).select('portNumber status connectorType maxPowerKw');
  broadcastStationStatus(station._id.toString(), chargers);

  sendSuccess(res, 200, 'Station updated.', { station });
});

// ── Delete Station ────────────────────────────────────────────────────────────
const deleteStation = catchAsync(async (req, res) => {
  const station = await ChargingStation.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!station) throw new AppError('Station not found', 404);
  sendSuccess(res, 200, 'Station deactivated.');
});

// ── Filter by charger type ────────────────────────────────────────────────────
const filterByCharger = catchAsync(async (req, res) => {
  const { type, lat, lng, radiusKm = 20 } = req.query;
  const query = { isActive: true };
  if (type) query.chargerTypes = { $in: [type] };
  if (lat && lng) {
    query.location = {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radiusKm) * 1000,
      },
    };
  }
  const stations = await ChargingStation.find(query).limit(50).select('-__v');
  sendSuccess(res, 200, 'Filtered stations fetched.', { stations, total: stations.length });
});

// ── List All Stations (Admin) ─────────────────────────────────────────────────
const listAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, isActive, isVerified, city } = req.query;
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';
  if (city) query['address.city'] = new RegExp(city, 'i');

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [stations, total] = await Promise.all([
    ChargingStation.find(query).skip(skip).limit(parseInt(limit)).select('-__v'),
    ChargingStation.countDocuments(query),
  ]);

  sendPaginated(res, 200, 'Stations fetched.', stations, {
    page: parseInt(page), limit: parseInt(limit), total,
    pages: Math.ceil(total / parseInt(limit)),
  });
});

module.exports = { getNearby, getDetails, getAvailability, createStation, updateStation, deleteStation, filterByCharger, listAll };
