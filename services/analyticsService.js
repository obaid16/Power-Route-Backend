const Booking = require('../models/Booking');
const ChargingStation = require('../models/ChargingStation');

async function getUserBookingStats(userId) {
  const completed = await Booking.countDocuments({ user: userId, status: 'completed' });
  const active = await Booking.countDocuments({ user: userId, status: 'active' });
  const cancelled = await Booking.countDocuments({ user: userId, status: 'cancelled' });
  return { completed, active, cancelled, total: completed + active + cancelled };
}

async function chargingHistory(userId, limit = 50) {
  return Booking.find({ user: userId })
    .sort({ bookingTime: -1 })
    .limit(limit)
    .populate('chargingStation', 'stationName location pricing chargingSpeedKw')
    .lean();
}

/**
 * Energy (kWh) approximated from duration and station speed (demo heuristic).
 */
function estimateSessionKwh(booking, station) {
  const hours = booking.chargingDurationMinutes / 60;
  const kw = station?.chargingSpeedKw || 50;
  return Math.min(kw * hours * 0.85, (station?.chargingSpeedKw || 50) * hours);
}

async function energyUsageSummary(userId) {
  const bookings = await Booking.find({
    user: userId,
    status: { $in: ['completed', 'active'] },
  })
    .populate('chargingStation')
    .lean();
  let totalKwh = 0;
  for (const b of bookings) {
    totalKwh += estimateSessionKwh(b, b.chargingStation);
  }
  return {
    estimatedTotalKwh: Math.round(totalKwh * 10) / 10,
    sessionCount: bookings.length,
  };
}

async function ecoScore(userId) {
  const stats = await getUserBookingStats(userId);
  const completed = stats.completed || 0;
  const base = 40 + Math.min(60, completed * 4);
  const cancelledPenalty = Math.min(20, (stats.cancelled || 0) * 2);
  const score = Math.max(0, Math.min(100, Math.round(base - cancelledPenalty)));
  return {
    ecoScore: score,
    factors: {
      completedSessions: completed,
      cancelledSessions: stats.cancelled,
      note: 'Demo score from session behavior; integrate grid carbon intensity for production.',
    },
  };
}

async function costTracking(userId) {
  const bookings = await Booking.find({ user: userId, paymentStatus: 'paid' })
    .populate('chargingStation', 'pricing')
    .lean();
  let total = 0;
  const currency = bookings[0]?.chargingStation?.pricing?.currency || 'INR';
  for (const b of bookings) {
    const perKwh = b.chargingStation?.pricing?.perKwh || 0;
    const sessionFee = b.chargingStation?.pricing?.sessionFee || 0;
    const kwh = estimateSessionKwh(b, b.chargingStation);
    total += sessionFee + kwh * perKwh;
  }
  return {
    currency,
    estimatedTotalCost: Math.round(total * 100) / 100,
    paidSessions: bookings.length,
  };
}

module.exports = {
  chargingHistory,
  energyUsageSummary,
  ecoScore,
  costTracking,
  getUserBookingStats,
};
