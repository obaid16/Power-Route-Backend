/**
 * Vehicle Model — EV specifications, battery state, connector compatibility
 */
const mongoose = require('mongoose');

const CONNECTOR_TYPES = ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'Tesla', 'GB/T', 'Other'];

const vehicleSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, min: 2010, max: 2035 },
    licensePlate: { type: String, trim: true, uppercase: true },
    vin: { type: String, trim: true },

    // ── Battery ──────────────────────────────────────────────────────────────
    batteryCapacityKwh: { type: Number, required: true, min: 1 },
    currentBatteryPercent: { type: Number, default: 100, min: 0, max: 100 },
    rangeKm: { type: Number, default: 0, min: 0 },
    consumptionKwhPer100km: { type: Number, default: 18, min: 1 },

    // ── Charging ─────────────────────────────────────────────────────────────
    connectorTypes: [{ type: String, enum: CONNECTOR_TYPES }],
    maxChargingSpeedKw: { type: Number, default: 50, min: 0 },

    // ── Meta ─────────────────────────────────────────────────────────────────
    color: { type: String, default: '', trim: true },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ user: 1, isDefault: -1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
module.exports.CONNECTOR_TYPES = CONNECTOR_TYPES;
