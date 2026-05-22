/**
 * StationOwner Model — Owner profile, verified documents, bank details
 */
const mongoose = require('mongoose');

const VERIFICATION_STATUS = ['pending', 'under_review', 'verified', 'rejected'];

const stationOwnerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    // ── Business Info ─────────────────────────────────────────────────────────
    businessName: { type: String, required: true, trim: true },
    businessType: { type: String, enum: ['individual', 'partnership', 'pvt_ltd', 'llp', 'other'], default: 'individual' },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },

    // ── Contact ────────────────────────────────────────────────────────────────
    businessPhone: { type: String, trim: true },
    businessEmail: { type: String, trim: true, lowercase: true },
    businessAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    // ── Verification ──────────────────────────────────────────────────────────
    verificationStatus: { type: String, enum: VERIFICATION_STATUS, default: 'pending', index: true },
    documents: [{
      type: { type: String, enum: ['gst_cert', 'pan_card', 'business_reg', 'electricity_bill', 'aadhar', 'other'] },
      url: { type: String },
      uploadedAt: { type: Date, default: Date.now },
      verified: { type: Boolean, default: false },
    }],
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },

    // ── Bank Details (encrypted in production) ────────────────────────────────
    bankAccountName: { type: String, trim: true },
    bankAccountNumber: { type: String, select: false },
    bankIfsc: { type: String, trim: true },
    razorpayAccountId: { type: String, trim: true },

    // ── Owned Stations ────────────────────────────────────────────────────────
    stations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation' }],
    totalRevenue: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StationOwner', stationOwnerSchema);
module.exports.VERIFICATION_STATUS = VERIFICATION_STATUS;
