/**
 * LiveTrip Model — Real-time journey tracking with SoC and route coordinates
 */
const mongoose = require('mongoose');

const TRIP_STATUS = ['planned', 'active', 'paused', 'completed', 'cancelled'];

const liveTripSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    status: { type: String, enum: TRIP_STATUS, default: 'planned' },

    // ── Route ─────────────────────────────────────────────────────────────────
    origin: {
      coordinates: { type: [Number], required: true },
      address: { type: String, trim: true },
    },
    destination: {
      coordinates: { type: [Number], required: true },
      address: { type: String, trim: true },
    },
    waypoints: [{
      coordinates: { type: [Number] },
      stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation' },
      plannedStopMinutes: { type: Number, default: 30 },
      order: { type: Number },
    }],

    // ── Real-Time Position ────────────────────────────────────────────────────
    currentPosition: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    positionHistory: [{
      coordinates: { type: [Number] },
      timestamp: { type: Date, default: Date.now },
      speedKmh: { type: Number, default: 0 },
    }],

    // ── Battery State ─────────────────────────────────────────────────────────
    startBatteryPercent: { type: Number, min: 0, max: 100 },
    currentBatteryPercent: { type: Number, min: 0, max: 100 },
    estimatedRangeKm: { type: Number, default: 0 },

    // ── Trip Stats ────────────────────────────────────────────────────────────
    totalDistanceKm: { type: Number, default: 0 },
    estimatedArrivalAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    // ── Safety ────────────────────────────────────────────────────────────────
    isLiveShared: { type: Boolean, default: false },
    shareToken: { type: String, sparse: true },
    shareExpiresAt: { type: Date },
    emergencyContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyContact' }],
  },
  { timestamps: true }
);

liveTripSchema.index({ currentPosition: '2dsphere' }, { sparse: true });
liveTripSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LiveTrip', liveTripSchema);
module.exports.TRIP_STATUS = TRIP_STATUS;
