/**
 * WomenSafetyReview — community safety reviews tied to a charging station.
 */
const mongoose = require('mongoose');

const womenSafetyReviewSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',            required: true },
    station:    { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation', required: true },
    rating:     { type: Number, min: 1, max: 5, required: true },
    text:       { type: String, trim: true, default: '' },
    safeAlone:  { type: Boolean, required: true },   // felt safe charging alone?
    verified:   { type: Boolean, default: false },   // moderation flag
  },
  { timestamps: true }
);

womenSafetyReviewSchema.index({ station: 1, createdAt: -1 });
womenSafetyReviewSchema.index({ user: 1 });

module.exports = mongoose.model('WomenSafetyReview', womenSafetyReviewSchema);
