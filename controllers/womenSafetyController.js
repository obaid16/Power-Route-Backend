/**
 * womenSafetyController — thin HTTP layer for the Women Safety Shield feature.
 * All domain logic lives in womenSafetyService.
 */

const catchAsync    = require('../utils/catchAsync');
const womenSafety   = require('../services/womenSafetyService');

// ── POST /api/women-safety/activate ──────────────────────────────────────────
const activateShield = catchAsync(async (req, res) => {
  const { lat, lng, guardianContacts = [] } = req.body;
  const result = await womenSafety.activateShield(req.user._id, lat, lng, guardianContacts);
  res.status(201).json({
    status:  'success',
    message: 'Women Safety Mode activated. Guardian mode is ON.',
    data:    result,
  });
});

// ── POST /api/women-safety/deactivate ────────────────────────────────────────
const deactivateShield = catchAsync(async (req, res) => {
  const { lat, lng } = req.body;
  const result = await womenSafety.deactivateShield(req.user._id, lat, lng);
  res.status(200).json({
    status:  'success',
    message: 'Women Safety Mode deactivated.',
    data:    result,
  });
});

// ── POST /api/women-safety/share-location ────────────────────────────────────
const shareLocation = catchAsync(async (req, res) => {
  const { lat, lng, message } = req.body;
  const result = await womenSafety.shareLiveLocation(req.user._id, lat, lng, message);
  res.status(200).json({
    status:  'success',
    message: 'Live location shared with guardian contacts.',
    data:    result,
  });
});

// ── GET /api/women-safety/safe-stations ──────────────────────────────────────
const safeStations = catchAsync(async (req, res) => {
  const lat        = parseFloat(req.query.lat);
  const lng        = parseFloat(req.query.lng);
  const radiusKm   = req.query.radiusKm  ? parseFloat(req.query.radiusKm)   : 25;
  const maxWaitMin = req.query.maxWaitMin ? parseInt(req.query.maxWaitMin, 10) : undefined;

  const filters = {
    radiusKm,
    womenSafe:   req.query.womenSafe === 'true'  ? true : undefined,
    open247:     req.query.open247   === 'true'  ? true : undefined,
    cctv:        req.query.cctv      === 'true'  ? true : undefined,
    maxWaitMin,
  };

  const stations = await womenSafety.getSafeStations(lat, lng, filters);

  res.status(200).json({
    status: 'success',
    data:   { count: stations.length, stations },
  });
});

// ── POST /api/women-safety/sos ────────────────────────────────────────────────
const womenSos = catchAsync(async (req, res) => {
  const { lat, lng, message } = req.body;
  const result = await womenSafety.womenSos(req.user._id, lat, lng, message);
  res.status(201).json({
    status:  'success',
    message: 'Women SOS recorded. Emergency services are being alerted.',
    data:    result,
    helplines: {
      police:       '112',
      ambulance:    '108',
      womenHelpline:'181',
      fire:         '101',
    },
  });
});

// ── POST /api/women-safety/community-review ───────────────────────────────────
const submitReview = catchAsync(async (req, res) => {
  const { stationId, rating, text, safeAlone } = req.body;
  const review = await womenSafety.submitCommunityReview(
    req.user._id,
    stationId,
    { rating, text, safeAlone }
  );
  res.status(201).json({
    status:  'success',
    message: 'Safety review submitted. Thank you for keeping the community safe.',
    data:    { review },
  });
});

// ── GET /api/women-safety/community-reviews/:stationId ───────────────────────
const getReviews = catchAsync(async (req, res) => {
  const { stationId } = req.params;
  const limit  = Math.min(parseInt(req.query.limit  || '20', 10), 50);
  const skip   = Math.max(parseInt(req.query.skip   || '0',  10), 0);

  const reviews = await womenSafety.getCommunityReviews(stationId, { limit, skip });
  res.status(200).json({
    status: 'success',
    data:   { count: reviews.length, reviews },
  });
});

module.exports = {
  activateShield,
  deactivateShield,
  shareLocation,
  safeStations,
  womenSos,
  submitReview,
  getReviews,
};
