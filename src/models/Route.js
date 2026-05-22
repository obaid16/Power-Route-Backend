/**
 * Route Model — Saved/optimized routes with charging waypoints and safety scoring
 */
const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, trim: true, default: 'My Route' },

    origin: {
      coordinates: { type: [Number], required: true },
      address: { type: String, trim: true },
    },
    destination: {
      coordinates: { type: [Number], required: true },
      address: { type: String, trim: true },
    },

    // ── Planned Stops ─────────────────────────────────────────────────────────
    chargingStops: [{
      station: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation' },
      coordinates: { type: [Number] },
      estimatedArrivalBatteryPercent: { type: Number, min: 0, max: 100 },
      plannedChargeToPercent: { type: Number, min: 0, max: 100 },
      order: { type: Number },
    }],

    // ── Route Geometry ────────────────────────────────────────────────────────
    polyline: { type: String, default: '' }, // encoded polyline
    totalDistanceKm: { type: Number, default: 0 },
    estimatedDurationMinutes: { type: Number, default: 0 },

    // ── Safety Score ──────────────────────────────────────────────────────────
    safetyScore: { type: Number, default: 0, min: 0, max: 100 },
    womenSafetyScore: { type: Number, default: 0, min: 0, max: 100 },
    avoidHighways: { type: Boolean, default: false },
    preferWomenSafeStops: { type: Boolean, default: false },

    isSaved: { type: Boolean, default: true },
    isFavorite: { type: Boolean, default: false },
    lastUsedAt: { type: Date },
    useCount: { type: Number, default: 0 },

    // ── Computed from ORS/Geoapify ────────────────────────────────────────────
    provider: { type: String, enum: ['ors', 'geoapify', 'google', 'manual'], default: 'ors' },
    rawResponse: { type: mongoose.Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);

routeSchema.index({ user: 1, isFavorite: -1, lastUsedAt: -1 });

module.exports = mongoose.model('Route', routeSchema);
