const mongoose = require('mongoose');

const chargingStationSchema = new mongoose.Schema(
  {
    stationName: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    chargerTypes: [{ type: String, trim: true }],
    chargingSpeedKw: { type: Number, default: 0, min: 0 },
    slotAvailability: {
      totalSlots: { type: Number, default: 0, min: 0 },
      availableSlots: { type: Number, default: 0, min: 0 },
    },
    pricing: {
      currency: { type: String, default: 'INR' },
      perKwh: { type: Number, default: 0, min: 0 },
      sessionFee: { type: Number, default: 0, min: 0 },
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    isEmergencyCapable: { type: Boolean, default: false },
    // ── Women Safety Shield fields ──────────────────────────────────────────
    womenSafe:  { type: Boolean, default: false },
    cctv:       { type: Boolean, default: false },
    open247:    { type: Boolean, default: false },
    waitMinAvg: { type: Number,  default: 0, min: 0 },
    safetyRating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: true }
);

chargingStationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ChargingStation', chargingStationSchema);
