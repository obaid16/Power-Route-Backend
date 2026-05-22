/**
 * Review Model — Station ratings with safety tags (women-safe, well-lit, CCTV)
 */
const mongoose = require('mongoose');

const SAFETY_TAGS = ['women_safe', 'well_lit', 'cctv', 'security_guard', 'crowded', 'isolated', 'clean', 'fast_charger'];

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation', required: true, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 2000 },

    // ── Safety Tags ────────────────────────────────────────────────────────────
    safetyTags: [{ type: String, enum: SAFETY_TAGS }],
    safetyRating: { type: Number, min: 1, max: 5 },

    // ── Sub-ratings ────────────────────────────────────────────────────────────
    chargerCondition: { type: Number, min: 1, max: 5 },
    cleanliness: { type: Number, min: 1, max: 5 },
    staffHelpfulness: { type: Number, min: 1, max: 5 },
    waitTime: { type: Number, min: 1, max: 5 },

    images: [{ type: String }],

    isVerifiedVisit: { type: Boolean, default: false }, // user had a completed booking
    helpfulCount: { type: Number, default: 0 },
    reportedCount: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ station: 1, createdAt: -1 });
reviewSchema.index({ user: 1, station: 1 }, { unique: true }); // one review per user per station

module.exports = mongoose.model('Review', reviewSchema);
module.exports.SAFETY_TAGS = SAFETY_TAGS;
