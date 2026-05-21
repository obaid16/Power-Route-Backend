const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const stationService = require('../services/stationService');
const openChargeMapService = require('../services/openChargeMapService');
const { ocmApiKey } = require('../config/env');

const getNearby = catchAsync(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = req.query.radiusKm != null ? Number(req.query.radiusKm) : stationService.DEFAULT_RADIUS_KM;
  const raw = await stationService.findNearbyStations(lat, lng, radiusKm);
  const data = stationService.attachDistanceKm(raw, lat, lng);
  res.status(200).json({ status: 'success', results: data.length, data: { stations: data } });
});

const filterByCharger = catchAsync(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const { chargerType } = req.query;
  const radiusKm = req.query.radiusKm != null ? Number(req.query.radiusKm) : stationService.DEFAULT_RADIUS_KM;
  const filtered = await stationService.findNearbyByChargerType(lat, lng, chargerType, radiusKm);
  const data = stationService.attachDistanceKm(filtered, lat, lng);
  res.status(200).json({ status: 'success', results: data.length, data: { stations: data } });
});

const getDetails = catchAsync(async (req, res) => {
  const station = await stationService.getStationById(req.params.id);
  if (!station) {
    throw new AppError('Charging station not found', 404);
  }
  res.status(200).json({ status: 'success', data: { station } });
});

const getAvailability = catchAsync(async (req, res) => {
  const delta = req.query.delta != null ? Number(req.query.delta) : 0;
  const availability = await stationService.getSlotAvailability(req.params.id, delta);
  if (!availability) {
    throw new AppError('Charging station not found', 404);
  }
  res.status(200).json({ status: 'success', data: { availability } });
});

const getOcmNearby = catchAsync(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const distanceKm =
    req.query.distanceKm != null ? Number(req.query.distanceKm) : openChargeMapService.DEFAULT_DISTANCE_KM;
  const maxResults =
    req.query.maxResults != null ? Number(req.query.maxResults) : openChargeMapService.DEFAULT_MAX_RESULTS;
  const stations = await openChargeMapService.fetchNearbyStations(lat, lng, distanceKm, maxResults);
  res.status(200).json({
    status: 'success',
    results: stations.length,
    data: {
      provider: 'Open Charge Map',
      stations,
      meta: {
        distanceKm,
        maxResults,
        hasApiKey: Boolean(ocmApiKey),
      },
    },
  });
});

module.exports = { getNearby, filterByCharger, getDetails, getAvailability, getOcmNearby };
