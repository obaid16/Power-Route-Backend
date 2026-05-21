const mongoose = require('mongoose');

const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded'];

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    chargingStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChargingStation',
      required: true,
    },
    bookingTime: { type: Date, required: true },
    chargingDurationMinutes: { type: Number, required: true, min: 1 },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'pending' },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, bookingTime: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
