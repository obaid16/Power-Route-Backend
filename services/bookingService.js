const Booking = require('../models/Booking');
const ChargingStation = require('../models/ChargingStation');
const AppError = require('../utils/AppError');

async function createBooking(userId, chargingStationId, bookingTime, chargingDurationMinutes) {
  const station = await ChargingStation.findOneAndUpdate(
    { _id: chargingStationId, 'slotAvailability.availableSlots': { $gte: 1 } },
    { $inc: { 'slotAvailability.availableSlots': -1 } },
    { new: true }
  );
  if (!station) {
    const exists = await ChargingStation.findById(chargingStationId);
    if (!exists) throw new AppError('Charging station not found', 404);
    throw new AppError('No charging slots available at this station', 409);
  }
  try {
    const booking = await Booking.create({
      user: userId,
      chargingStation: chargingStationId,
      bookingTime: new Date(bookingTime),
      chargingDurationMinutes,
      paymentStatus: 'pending',
      status: 'active',
    });
    return booking;
  } catch (err) {
    await ChargingStation.findByIdAndUpdate(chargingStationId, {
      $inc: { 'slotAvailability.availableSlots': 1 },
    });
    throw err;
  }
}

async function cancelBooking(userId, bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  if (String(booking.user) !== String(userId)) {
    throw new AppError('You cannot cancel this booking', 403);
  }
  if (booking.status === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }
  booking.status = 'cancelled';
  await booking.save();
  await ChargingStation.findByIdAndUpdate(booking.chargingStation, {
    $inc: { 'slotAvailability.availableSlots': 1 },
  });
  const station = await ChargingStation.findById(booking.chargingStation);
  if (station && station.slotAvailability.availableSlots > station.slotAvailability.totalSlots) {
    station.slotAvailability.availableSlots = station.slotAvailability.totalSlots;
    await station.save();
  }
  return booking;
}

async function listHistory(userId, limit = 50) {
  return Booking.find({ user: userId })
    .sort({ bookingTime: -1 })
    .limit(limit)
    .populate('chargingStation', 'stationName location chargerTypes chargingSpeedKw pricing')
    .lean();
}

module.exports = { createBooking, cancelBooking, listHistory };
