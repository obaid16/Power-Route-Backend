/**
 * User Model — PowerRoute
 * Enhanced with roles, refresh tokens, password reset, and geospatial indexing
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: '' },

    // ── Role & Status ───────────────────────────────────────────────────────
    role: { type: String, enum: ['user', 'admin', 'stationOwner'], default: 'user', index: true },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    // ── Email OTP ───────────────────────────────────────────────────────────
    emailOtp: { type: String, select: false },
    emailOtpExpires: { type: Date, select: false },

    // ── Password Reset ──────────────────────────────────────────────────────
    passwordResetOtp: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // ── Refresh Tokens (for multi-device session management) ────────────────
    refreshTokens: [{
      token: { type: String, select: false },
      device: { type: String, default: 'unknown' },
      createdAt: { type: Date, default: Date.now },
    }],

    // ── Vehicle profile (quick ref — detailed in Vehicle model) ─────────────
    evVehicleModel: { type: String, default: '', trim: true },
    batteryCapacityKwh: { type: Number, default: 0, min: 0 },
    chargerType: { type: String, default: '', trim: true },
    currentBatteryPercent: { type: Number, default: 0, min: 0, max: 100 },

    // ── Location ─────────────────────────────────────────────────────────────
    lastKnownLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // ── Emergency ────────────────────────────────────────────────────────────
    emergencyContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyContact' }],

    // ── Wallet Reference ─────────────────────────────────────────────────────
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  },
  { timestamps: true }
);

userSchema.index({ lastKnownLocation: '2dsphere' }, { sparse: true });
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
