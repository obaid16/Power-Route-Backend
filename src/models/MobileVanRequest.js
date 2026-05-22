/**
 * MobileVanRequest Model — Emergency roadside mobile charger dispatch tracking
 */
const mongoose = require('mongoose');

const VAN_REQUEST_STATUS = ['requested', 'accepted', 'dispatched', 'en_route', 'arrived', 'charging', 'completed', 'cancelled'];

const mobileVanRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    van: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingVan', index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

    status: { type: String, enum: VAN_REQUEST_STATUS, default: 'requested' },

    // ── User's stranded location ──────────────────────────────────────────────
    userLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    userAddress: { type: String, trim: true },

    // ── Van live location ─────────────────────────────────────────────────────
    vanLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // ── Driver Details ────────────────────────────────────────────────────────
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    vehiclePlate: { type: String, trim: true },
    estimatedArrivalMinutes: { type: Number, default: 0 },

    // ── Charging ──────────────────────────────────────────────────────────────
    requestedKwh: { type: Number, default: 10, min: 1 },
    deliveredKwh: { type: Number, default: 0 },

    // ── Payment ───────────────────────────────────────────────────────────────
    estimatedCostINR: { type: Number, default: 0 },
    finalCostINR: { type: Number, default: 0 },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    // ── Timestamps ───────────────────────────────────────────────────────────
    dispatchedAt: { type: Date },
    arrivedAt: { type: Date },
    completedAt: { type: Date },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

mobileVanRequestSchema.index({ userLocation: '2dsphere' });
mobileVanRequestSchema.index({ vanLocation: '2dsphere' }, { sparse: true });
mobileVanRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('MobileVanRequest', mobileVanRequestSchema);
module.exports.VAN_REQUEST_STATUS = VAN_REQUEST_STATUS;
