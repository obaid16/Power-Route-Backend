/**
 * Booking Model — Slot locking, QR code, expiry, and status lifecycle
 */
const mongoose = require('mongoose');

const BOOKING_STATUS = ['pending', 'locked', 'active', 'completed', 'cancelled', 'expired'];
const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded'];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation', required: true, index: true },
    charger: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger', index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    // ── Slot Details ──────────────────────────────────────────────────────────
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },
    estimatedEndAt: { type: Date },

    // ── Lock & Expiry (prevents double-booking) ───────────────────────────────
    slotLockedUntil: { type: Date, index: true },
    lockToken: { type: String, select: false },

    // ── Status ────────────────────────────────────────────────────────────────
    status: { type: String, enum: BOOKING_STATUS, default: 'pending' },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'pending' },

    // ── Pricing Snapshot ──────────────────────────────────────────────────────
    estimatedCostINR: { type: Number, default: 0, min: 0 },
    finalCostINR: { type: Number, default: 0, min: 0 },
    energyDeliveredKwh: { type: Number, default: 0, min: 0 },

    // ── QR Code ───────────────────────────────────────────────────────────────
    qrCode: { type: String, default: '' },
    qrCodeExpires: { type: Date },

    // ── Relations ─────────────────────────────────────────────────────────────
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    cancellationReason: { type: String, trim: true },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, scheduledAt: -1 });
bookingSchema.index({ station: 1, charger: 1, scheduledAt: 1 });
bookingSchema.index({ status: 1, slotLockedUntil: 1 }); // for cron expiry queries
bookingSchema.index({ charger: 1, status: 1, scheduledAt: 1 }); // double-booking prevention

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUS = BOOKING_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
