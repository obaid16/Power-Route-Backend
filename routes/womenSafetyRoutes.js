/**
 * Women Safety Shield routes  —  all prefixed at /api/women-safety
 *
 * POST   /activate                          – Turn on guardian mode
 * POST   /deactivate                        – Turn off guardian mode
 * POST   /share-location                    – Push live GPS
 * GET    /safe-stations?lat=&lng=&...       – Filtered safety-scored chargers
 * POST   /sos                               – One-tap women SOS
 * POST   /community-review                  – Submit station safety review
 * GET    /community-reviews/:stationId      – Fetch reviews for a station
 */

const express              = require('express');
const { protect }          = require('../middleware/authMiddleware');
const { validateRequest }  = require('../middleware/validateMiddleware');
const controller           = require('../controllers/womenSafetyController');
const {
  activateShieldRules,
  deactivateShieldRules,
  shareLocationRules,
  safeStationsRules,
  womenSosRules,
  communityReviewRules,
} = require('../validators/womenSafetyValidator');

const router = express.Router();

// All routes require a valid JWT
router.use(protect);

router.post(
  '/activate',
  activateShieldRules, validateRequest,
  controller.activateShield
);

router.post(
  '/deactivate',
  deactivateShieldRules, validateRequest,
  controller.deactivateShield
);

router.post(
  '/share-location',
  shareLocationRules, validateRequest,
  controller.shareLocation
);

router.get(
  '/safe-stations',
  safeStationsRules, validateRequest,
  controller.safeStations
);

router.post(
  '/sos',
  womenSosRules, validateRequest,
  controller.womenSos
);

router.post(
  '/community-review',
  communityReviewRules, validateRequest,
  controller.submitReview
);

router.get(
  '/community-reviews/:stationId',
  controller.getReviews
);

module.exports = router;
