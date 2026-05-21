/**
 * womenSafetyService — all domain logic for the VoltPath Shield / Women Safety feature.
 *
 * Endpoints served:
 *   POST   /women-safety/activate         – activate guardian mode & log alert
 *   POST   /women-safety/deactivate       – deactivate & log
 *   POST   /women-safety/share-location   – push live GPS to emergency record
 *   GET    /women-safety/safe-stations    – filtered, safety-scored nearby stations
 *   POST   /women-safety/sos             – one-tap SOS (women-specific alert)
 *   POST   /women-safety/community-review – submit a safety review for a station
 *   GET    /women-safety/community-reviews/:stationId – fetch reviews for a station
 */

const ChargingStation     = require('../models/ChargingStation');
const EmergencyAlert      = require('../models/EmergencyAlert');
const WomenSafetyReview   = require('../models/WomenSafetyReview');
const User                = require('../models/User');
const { haversineKm }     = require('../utils/geo');

// ── Activate Women Safety / Guardian Mode ─────────────────────────────────────
async function activateShield(userId, lat, lng, guardianContacts = []) {
  // Log the activation alert
  const alert = await EmergencyAlert.create({
    user:     userId,
    type:     'guardian_start',
    location: { type: 'Point', coordinates: [lng, lat] },
    message:  `Women Safety Mode activated. Guardian contacts: ${guardianContacts.length}`,
  });

  // Persist last known location
  await User.findByIdAndUpdate(userId, {
    lastKnownLocation: { type: 'Point', coordinates: [lng, lat] },
  });

  return { alert, guardianContacts };
}

// ── Deactivate Guardian Mode ──────────────────────────────────────────────────
async function deactivateShield(userId, lat, lng) {
  const alert = await EmergencyAlert.create({
    user:     userId,
    type:     'guardian_stop',
    location: { type: 'Point', coordinates: [lng ?? 0, lat ?? 0] },
    message:  'Women Safety Mode deactivated.',
  });
  return { alert };
}

// ── Share Live Location ───────────────────────────────────────────────────────
async function shareLiveLocation(userId, lat, lng, message = '') {
  await User.findByIdAndUpdate(userId, {
    lastKnownLocation: { type: 'Point', coordinates: [lng, lat] },
  });
  const alert = await EmergencyAlert.create({
    user:     userId,
    type:     'share_location',
    location: { type: 'Point', coordinates: [lng, lat] },
    message:  message || 'Live location shared from VoltPath Shield.',
  });
  return { alert };
}

// ── Get Safe Stations ─────────────────────────────────────────────────────────
/**
 * Returns nearby stations enriched with a composite safety score.
 * Applies optional filters: womenSafe, open247, cctv, maxWaitMin.
 */
async function getSafeStations(lat, lng, { radiusKm = 25, womenSafe, open247, cctv, maxWaitMin } = {}) {
  const matchQuery = {};
  if (womenSafe === true)  matchQuery.womenSafe = true;
  if (open247   === true)  matchQuery.open247   = true;
  if (cctv      === true)  matchQuery.cctv      = true;
  if (maxWaitMin != null)  matchQuery.waitMinAvg = { $lte: maxWaitMin };

  const stations = await ChargingStation.aggregate([
    {
      $geoNear: {
        near:          { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance:   radiusKm * 1000,
        spherical:     true,
        query:         matchQuery,
      },
    },
    { $limit: 20 },
    {
      $addFields: {
        distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
        // Composite safety score out of 100
        safetyScore: {
          $add: [
            { $multiply: [{ $cond: ['$womenSafe', 1, 0] }, 30] },
            { $multiply: [{ $cond: ['$cctv',      1, 0] }, 25] },
            { $multiply: [{ $cond: ['$open247',   1, 0] }, 15] },
            { $multiply: [{ $divide: [{ $subtract: [120, { $min: ['$waitMinAvg', 120] }] }, 120] }, 20] },
            { $multiply: [{ $divide: ['$safetyRating', 5] }, 10] },
          ],
        },
      },
    },
    { $sort: { safetyScore: -1, distanceKm: 1 } },
  ]);

  return stations;
}

// ── Women SOS ─────────────────────────────────────────────────────────────────
async function womenSos(userId, lat, lng, message = '') {
  await User.findByIdAndUpdate(userId, {
    lastKnownLocation: { type: 'Point', coordinates: [lng, lat] },
  });

  const alert = await EmergencyAlert.create({
    user:     userId,
    type:     'women_safety',
    location: { type: 'Point', coordinates: [lng, lat] },
    message:  message || 'WOMEN SOS triggered via VoltPath Shield.',
  });

  // Find nearest safe (women-capable) station as destination hint
  const [nearestStation] = await ChargingStation.aggregate([
    {
      $geoNear: {
        near:          { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        spherical:     true,
        query:         { womenSafe: true },
      },
    },
    { $limit: 1 },
  ]);

  const destination = nearestStation
    ? {
        name:        nearestStation.stationName,
        distanceKm:  Math.round(haversineKm(lat, lng,
                       nearestStation.location.coordinates[1],
                       nearestStation.location.coordinates[0]) * 100) / 100,
        coordinates: nearestStation.location.coordinates,
        cctv:        nearestStation.cctv,
        open247:     nearestStation.open247,
      }
    : null;

  return { alert, nearestSafeStation: destination };
}

// ── Submit Community Safety Review ────────────────────────────────────────────
async function submitCommunityReview(userId, stationId, { rating, text, safeAlone }) {
  // Upsert: one review per user per station
  const review = await WomenSafetyReview.findOneAndUpdate(
    { user: userId, station: stationId },
    { rating, text, safeAlone, verified: false },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Recompute the station's aggregate safety rating from all women-safety reviews
  const agg = await WomenSafetyReview.aggregate([
    { $match: { station: review.station } },
    { $group: { _id: '$station', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (agg.length > 0) {
    await ChargingStation.findByIdAndUpdate(stationId, {
      'ratings.average': Math.round(agg[0].avg * 10) / 10,
      'ratings.count':   agg[0].count,
    });
  }

  return review;
}

// ── Fetch Community Reviews for a Station ─────────────────────────────────────
async function getCommunityReviews(stationId, { limit = 20, skip = 0 } = {}) {
  const reviews = await WomenSafetyReview.find({ station: stationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name')
    .lean();

  return reviews.map((r) => ({
    id:         String(r._id),
    author:     r.user?.name ?? 'Verified user',
    rating:     r.rating,
    safeAlone:  r.safeAlone,
    text:       r.text,
    trust:      r.verified ? 'High trust · Verified' : 'Verified',
    date:       r.createdAt,
  }));
}

module.exports = {
  activateShield,
  deactivateShield,
  shareLiveLocation,
  getSafeStations,
  womenSos,
  submitCommunityReview,
  getCommunityReviews,
};
