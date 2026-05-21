const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['sos', 'low_battery', 'share_location', 'towing_request', 'women_safety', 'guardian_start', 'guardian_stop'], required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    message: { type: String, default: '' },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

emergencyAlertSchema.index({ location: '2dsphere' });
emergencyAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
