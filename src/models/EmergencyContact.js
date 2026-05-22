/**
 * EmergencyContact Model — User trusted circle for SOS broadcasts
 */
const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    relation: {
      type: String,
      enum: ['family', 'friend', 'colleague', 'emergency_service', 'other'],
      default: 'other',
    },
    alertPriority: { type: Number, default: 1, min: 1, max: 5 }, // 1 = highest
    receivesSMS: { type: Boolean, default: true },
    receivesEmail: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

emergencyContactSchema.index({ user: 1, alertPriority: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
