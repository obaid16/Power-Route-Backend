/**
 * SOSAlert Model — Emergency event logs with coordinates, responder tracking
 */
const mongoose = require('mongoose');

const SOS_STATUS = ['active', 'acknowledged', 'help_dispatched', 'resolved', 'false_alarm'];
const SOS_TYPES = ['breakdown', 'accident', 'medical', 'security', 'low_battery', 'other'];

const sosAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveTrip' },

    type: { type: String, enum: SOS_TYPES, default: 'other' },
    status: { type: String, enum: SOS_STATUS, default: 'active' },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, trim: true },

    // ── Battery State at time of SOS ──────────────────────────────────────────
    batteryPercentAtSOS: { type: Number, min: 0, max: 100 },

    // ── Alert Details ─────────────────────────────────────────────────────────
    message: { type: String, trim: true, maxlength: 500 },
    autoTriggered: { type: Boolean, default: false }, // AI-triggered vs user-triggered

    // ── Notified Contacts ─────────────────────────────────────────────────────
    notifiedContacts: [{
      contact: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyContact' },
      notifiedAt: { type: Date },
      method: { type: String, enum: ['sms', 'email', 'socket'], default: 'socket' },
    }],

    // ── Responders ────────────────────────────────────────────────────────────
    activeHelpers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      respondedAt: { type: Date },
      eta: { type: Number }, // minutes
    }],

    // ── Nearby Stations Dispatched ────────────────────────────────────────────
    nearbyStations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChargingStation' }],
    mobileVanRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileVanRequest' },

    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

sosAlertSchema.index({ location: '2dsphere' });
sosAlertSchema.index({ user: 1, status: 1, createdAt: -1 });
sosAlertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
module.exports.SOS_STATUS = SOS_STATUS;
module.exports.SOS_TYPES = SOS_TYPES;
