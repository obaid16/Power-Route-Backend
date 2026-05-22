/**
 * bookingController.js — Slot locking, double-booking prevention, QR, status lifecycle
 */
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Charger = require('../models/Charger');
const ChargingStation = require('../models/ChargingStation');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');
const { broadcastStationStatus, emitToUser } = require('../services/socketService');
const { notifyBookingConfirmed } = require('../services/notificationService');

const SLOT_LOCK_MINUTES = 10; // Lock slot for 10 min while payment completes

// ── Create Booking with slot lock ────────────────────────────────────────────
const createBooking = catchAsync(async (req, res) => {
  const { stationId, chargerId, vehicleId, scheduledAt, durationMinutes } = req.body;
  const userId = req.user._id;

  const station = await ChargingStation.findById(stationId);
  if (!station || !station.isActive) throw new AppError('Station not found or inactive', 404);

  const charger = await Charger.findOne({ _id: chargerId, station: stationId, isActive: true });
  if (!charger) throw new AppError('Charger not found or inactive', 404);

  // ── Double-booking prevention ─────────────────────────────────────────────
  const scheduledStart = new Date(scheduledAt);
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60000);

  const conflict = await Booking.findOne({
    charger: chargerId,
    status: { $in: ['locked', 'active', 'pending'] },
    scheduledAt: { $lt: scheduledEnd },
    estimatedEndAt: { $gt: scheduledStart },
  });
  if (conflict) throw new AppError('This charger slot is already booked for this time', 409);

  // ── Estimate cost ─────────────────────────────────────────────────────────
  const pricePerKwh = charger.priceOverride?.enabled ? charger.priceOverride.perKwh : (station.pricing.perKwh * station.pricing.dynamicMultiplier);
  const estimatedKwh = (charger.maxPowerKw * (durationMinutes / 60)) * 0.85; // 85% efficiency
  const estimatedCostINR = Math.round(estimatedKwh * pricePerKwh + station.pricing.sessionFee);

  // ── Lock token ────────────────────────────────────────────────────────────
  const lockToken = crypto.randomBytes(32).toString('hex');

  const booking = await Booking.create({
    user: userId,
    station: stationId,
    charger: chargerId,
    vehicle: vehicleId,
    scheduledAt: scheduledStart,
    estimatedEndAt: scheduledEnd,
    durationMinutes,
    estimatedCostINR,
    lockToken,
    slotLockedUntil: new Date(Date.now() + SLOT_LOCK_MINUTES * 60000),
    status: 'locked',
  });

  // ── Update charger status ─────────────────────────────────────────────────
  await Charger.findByIdAndUpdate(chargerId, { status: 'occupied', currentBooking: booking._id });

  // ── Reduce available slots ────────────────────────────────────────────────
  await ChargingStation.findByIdAndUpdate(stationId, { $inc: { availableSlots: -1 } });

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const chargers = await Charger.find({ station: stationId }).select('portNumber status connectorType maxPowerKw');
  broadcastStationStatus(stationId, chargers);

  sendSuccess(res, 201, 'Booking slot locked. Complete payment within 10 minutes.', {
    booking: { ...booking.toObject(), lockToken: undefined },
    estimatedCostINR,
    lockExpiresAt: booking.slotLockedUntil,
  });
});

// ── Confirm Booking (after payment) ──────────────────────────────────────────
const confirmBooking = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status === 'active') return sendSuccess(res, 200, 'Booking already confirmed.', { booking });
  if (booking.status !== 'locked') throw new AppError(`Cannot confirm booking with status: ${booking.status}`, 400);
  if (booking.slotLockedUntil < new Date()) throw new AppError('Booking lock expired. Please rebook.', 410);

  // Generate QR code data (simple hash-based token)
  const qrData = crypto.createHash('sha256')
    .update(`${booking._id}:${req.user._id}:${booking.scheduledAt}`)
    .digest('hex');

  booking.status = 'active';
  booking.paymentStatus = 'paid';
  booking.qrCode = qrData;
  booking.qrCodeExpires = new Date(booking.scheduledAt.getTime() + 24 * 60 * 60 * 1000);
  await booking.save();

  // Notify user
  const station = await ChargingStation.findById(booking.station).select('stationName');
  await notifyBookingConfirmed(req.user._id, { ...booking.toObject(), stationName: station?.stationName });

  sendSuccess(res, 200, 'Booking confirmed!', { booking, qrCode: qrData });
});

// ── Cancel Booking ────────────────────────────────────────────────────────────
const cancelBooking = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });
  if (!booking) throw new AppError('Booking not found', 404);
  if (['completed', 'cancelled', 'expired'].includes(booking.status)) {
    throw new AppError(`Cannot cancel booking with status: ${booking.status}`, 400);
  }

  booking.status = 'cancelled';
  booking.cancellationReason = reason || 'User requested';
  booking.cancelledAt = new Date();
  await booking.save();

  // Free the charger
  await Charger.findByIdAndUpdate(booking.charger, { status: 'available', currentBooking: null });
  await ChargingStation.findByIdAndUpdate(booking.station, { $inc: { availableSlots: 1 } });

  // Broadcast updated status
  const chargers = await Charger.find({ station: booking.station }).select('portNumber status connectorType maxPowerKw');
  broadcastStationStatus(booking.station.toString(), chargers);

  emitToUser(req.user._id.toString(), 'booking:cancelled', { bookingId: booking._id });

  sendSuccess(res, 200, 'Booking cancelled.', { booking });
});

// ── Get My Bookings ───────────────────────────────────────────────────────────
const getMyBookings = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('station', 'stationName address location')
      .populate('charger', 'portNumber connectorType maxPowerKw')
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Booking.countDocuments(query),
  ]);

  sendPaginated(res, 200, 'Bookings fetched.', bookings, {
    page: parseInt(page), limit: parseInt(limit), total,
    pages: Math.ceil(total / parseInt(limit)),
  });
});

// ── Get Single Booking ────────────────────────────────────────────────────────
const getBooking = catchAsync(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.user._id })
    .populate('station', 'stationName address location pricing')
    .populate('charger', 'portNumber connectorType maxPowerKw chargingMode')
    .populate('payment', 'status amountINR razorpayPaymentId');

  if (!booking) throw new AppError('Booking not found', 404);
  sendSuccess(res, 200, 'Booking fetched.', { booking });
});

// ── Complete Booking (for admin / charger system) ─────────────────────────────
const completeBooking = catchAsync(async (req, res) => {
  const { energyDeliveredKwh, finalCostINR } = req.body;
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.status !== 'active') throw new AppError('Booking is not active', 400);

  booking.status = 'completed';
  booking.energyDeliveredKwh = energyDeliveredKwh || 0;
  booking.finalCostINR = finalCostINR || booking.estimatedCostINR;
  booking.completedAt = new Date();
  await booking.save();

  await Charger.findByIdAndUpdate(booking.charger, { status: 'available', currentBooking: null, $inc: { totalSessionsCompleted: 1 } });
  await ChargingStation.findByIdAndUpdate(booking.station, { $inc: { availableSlots: 1 } });

  const chargers = await Charger.find({ station: booking.station }).select('portNumber status connectorType maxPowerKw');
  broadcastStationStatus(booking.station.toString(), chargers);

  sendSuccess(res, 200, 'Booking completed.', { booking });
});

module.exports = { createBooking, confirmBooking, cancelBooking, getMyBookings, getBooking, completeBooking };
