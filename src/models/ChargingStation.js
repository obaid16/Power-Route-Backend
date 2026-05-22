/**
 * ChargingStation Model — GeoJSON location, owner ref, dynamic pricing, availability
 */
const mongoose = require('mongoose');

const chargingStationSchema = new mongoose.Schema(
  {
    stationName: { type: String, required: true, trim: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'StationOwner', index: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    chargerTypes: [{ type: String, trim: true }],
    totalSlots: { type: Number, default: 0, min: 0 },
    availableSlots: { type: Number, default: 0, min: 0 },
    pricing: {
      currency: { type: String, default: 'INR' },
      perKwh: { type: Number, default: 0, min: 0 },
      sessionFee: { type: Number, default: 0, min: 0 },
      dynamicMultiplier: { type: Number, default: 1.0, min: 0.5, max: 3.0 },
    },
    amenities: {
      wifi: { type: Boolean, default: false },
      restroom: { type: Boolean, default: false },
      cafeteria: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    // ── Safety & Women Safety ─────────────────────────────────────────────────
    isEmergencyCapable: { type: Boolean, default: false },
    womenSafe: { type: Boolean, default: false },
    cctv: { type: Boolean, default: false },
    open247: { type: Boolean, default: false },
    waitMinAvg: { type: Number, default: 0, min: 0 },
    safetyRating: { type: Number, default: 0, min: 0, max: 5 },
    // ── Status ────────────────────────────────────────────────────────────────
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    operatingHours: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '23:59' },
    },
    images: [{ type: String }],
    network: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

chargingStationSchema.index({ location: '2dsphere' });
chargingStationSchema.index({ isActive: 1, isVerified: 1 });
chargingStationSchema.index({ 'pricing.perKwh': 1 });

module.exports = mongoose.model('ChargingStation', chargingStationSchema);
