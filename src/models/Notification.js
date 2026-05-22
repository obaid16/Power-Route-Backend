/**
 * Notification Model — User-specific, typed notifications with read tracking
 */
const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'booking_confirmed', 'booking_cancelled', 'booking_reminder',
  'payment_received', 'payment_failed', 'refund_processed',
  'sos_alert', 'sos_resolved',
  'low_battery', 'charging_complete',
  'van_dispatched', 'van_arrived',
  'system', 'promo',
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    // Rich data payload for navigation / deep links
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Related document refs
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
