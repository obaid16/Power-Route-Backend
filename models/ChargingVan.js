const mongoose = require('mongoose');

const chargingVanSchema = new mongoose.Schema(
  {
    driverName: { type: String, required: true },
    vehicleNo: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    etaMinutes: { type: Number, required: true },
    maxKw: { type: Number, required: true },
    pricePerKwh: { type: Number, required: true },
    rating: { type: Number, required: true },
    available: { type: Boolean, default: true },
    phone: { type: String, required: true },
    // Tracks simulated booking/request state for current user
    activeRequestId: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChargingVan', chargingVanSchema);
