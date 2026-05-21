const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const emergencyService = require('../services/emergencyService');
const aiService = require('../services/aiService');

const triggerSos = catchAsync(async (req, res) => {
  const { lat, lng, message } = req.body;
  const alert = await emergencyService.createAlert(req.user._id, 'sos', lat, lng, message || '');
  res.status(201).json({
    status: 'success',
    message: 'Emergency alert recorded. Stay safe; help is being coordinated.',
    data: { alert },
  });
});

const nearestEmergency = catchAsync(async (req, res) => {
  const { lat, lng } = req.body;
  const station = await emergencyService.findNearestEmergencyStation(lat, lng);
  if (!station) {
    throw new AppError('No emergency-capable charging stations found nearby', 404);
  }
  const distanceKm =
    Math.round(
      require('../utils/geo').haversineKm(lat, lng, station.location.coordinates[1], station.location.coordinates[0]) *
        100
    ) / 100;
  res.status(200).json({
    status: 'success',
    data: { station: { ...station, distanceKm } },
  });
});

const shareLiveLocation = catchAsync(async (req, res) => {
  const { lat, lng } = req.body;
  const user = await emergencyService.updateUserLiveLocation(req.user._id, lat, lng);
  const alert = await emergencyService.createAlert(req.user._id, 'share_location', lat, lng, 'Live location share');
  res.status(200).json({
    status: 'success',
    data: {
      user: { id: user._id, lastKnownLocation: user.lastKnownLocation },
      alert,
    },
  });
});

const lowBattery = catchAsync(async (req, res) => {
  const lat = req.body.lat != null ? Number(req.body.lat) : null;
  const lng = req.body.lng != null ? Number(req.body.lng) : null;

  const analysis = await aiService.analyzeLowBatteryEmergency(req.user, lat, lng);

  if (req.user.currentBatteryPercent > 20) {
    return res.status(200).json({
      status: 'success',
      message: 'Battery level is not in critical range; no emergency routing triggered.',
      data: { ...analysis, alert: null },
    });
  }

  let alert = null;
  if (lat != null && lng != null) {
    alert = await emergencyService.createAlert(
      req.user._id,
      'low_battery',
      lat,
      lng,
      `Low battery: ${analysis.currentBatteryPercent}%`
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Low battery protocol activated',
    data: { ...analysis, alert },
  });
});

/**
 * POST /emergency/towing
 * Request towing service — logs an alert and returns nearest station as tow destination.
 */
const requestTowing = catchAsync(async (req, res) => {
  const { lat, lng, notes } = req.body;

  // Log towing alert
  const alert = await emergencyService.createAlert(
    req.user._id,
    'towing_request',
    lat,
    lng,
    notes || 'Towing service requested via PowerRoute'
  );

  // Find nearest station as suggested tow destination
  const station = await emergencyService.findNearestEmergencyStation(lat, lng);
  const destination = station
    ? {
        name: station.stationName,
        address: station.address,
        coordinates: station.location?.coordinates,
        distanceKm:
          Math.round(
            require('../utils/geo').haversineKm(
              lat, lng,
              station.location.coordinates[1],
              station.location.coordinates[0]
            ) * 100
          ) / 100,
      }
    : null;

  res.status(201).json({
    status: 'success',
    message: 'Towing request logged. Contact the towing helpline: 1802.',
    data: {
      alert,
      towingHelpline: '1802',
      suggestedDestination: destination,
    },
  });
});

module.exports = { triggerSos, nearestEmergency, shareLiveLocation, lowBattery, requestTowing };
