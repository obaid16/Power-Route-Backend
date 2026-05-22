/**
 * Charger Model — Individual charger units within a station
 */
const mongoose = require('mongoose');

const CONNECTOR_TYPES = ['AC_Type1', 'AC_Type2', 'DC_CCS', 'DC_CHAdeMO', 'Tesla', 'GB/T', 'Other'];
const CHARGER_STATUS = ['available', 'occupied', 'faulted', 'offline'];

const chargerSchema = new mongoose.Schema(
  {
    station: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation', required: true, index: true },
    portNumber: { type: String, required: true, trim: true },
    connectorType: { type: String, enum: CONNECTOR_TYPES, required: true },
    maxPowerKw: { type: Number, required: true, min: 1 },
    chargingMode: { type: String, enum: ['AC', 'DC'], required: true },
    status: { type: String, enum: CHARGER_STATUS, default: 'available' },
    currentBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    lastStatusChange: { type: Date, default: Date.now },
    totalSessionsCompleted: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    firmwareVersion: { type: String, default: '' },
    priceOverride: {
      enabled: { type: Boolean, default: false },
      perKwh: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

chargerSchema.index({ station: 1, status: 1 });
chargerSchema.index({ station: 1, connectorType: 1 });

module.exports = mongoose.model('Charger', chargerSchema);
module.exports.CONNECTOR_TYPES = CONNECTOR_TYPES;
module.exports.CHARGER_STATUS = CHARGER_STATUS;
