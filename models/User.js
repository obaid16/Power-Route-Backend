const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    // ── Email OTP verification ──────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailOtp:        { type: String, select: false },          // hashed OTP
    emailOtpExpires: { type: Date,   select: false },

    // ── Vehicle profile ─────────────────────────────────────────────────────
    evVehicleModel:        { type: String, default: '', trim: true },
    batteryCapacityKwh:    { type: Number, default: 0, min: 0 },
    chargerType:           { type: String, default: '', trim: true },
    currentBatteryPercent: { type: Number, default: 0, min: 0, max: 100 },

    // ── Location ─────────────────────────────────────────────────────────────
    lastKnownLocation: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

userSchema.index({ lastKnownLocation: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
