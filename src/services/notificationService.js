/**
 * notificationService.js — Create and deliver in-app notifications
 */
const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

/**
 * Create a notification and push it via Socket.io in real-time
 */
async function createNotification({ userId, type, title, body, data = {}, booking, payment, priority = 'normal', expiresAt }) {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    body,
    data,
    booking,
    payment,
    priority,
    expiresAt,
  });

  // Real-time push via socket
  emitToUser(userId, 'notification:new', {
    id: notification._id,
    type,
    title,
    body,
    data,
    priority,
    createdAt: notification.createdAt,
  });

  return notification;
}

/**
 * Create booking confirmation notification
 */
async function notifyBookingConfirmed(userId, booking) {
  return createNotification({
    userId,
    type: 'booking_confirmed',
    title: 'Booking Confirmed ✅',
    body: `Your charging slot at ${booking.stationName || 'the station'} is confirmed!`,
    data: { bookingId: booking._id, screen: 'BookingDetail' },
    booking: booking._id,
    priority: 'high',
  });
}

/**
 * Create payment received notification
 */
async function notifyPaymentReceived(userId, payment, amountINR) {
  return createNotification({
    userId,
    type: 'payment_received',
    title: 'Payment Successful 💰',
    body: `₹${amountINR} received. Booking confirmed.`,
    data: { paymentId: payment._id, screen: 'PaymentHistory' },
    payment: payment._id,
    priority: 'high',
  });
}

/**
 * Create SOS triggered notification
 */
async function notifySOSTriggered(userId, sosAlert) {
  return createNotification({
    userId,
    type: 'sos_alert',
    title: '🚨 SOS Activated',
    body: 'Your emergency alert has been sent. Help is on the way.',
    data: { sosId: sosAlert._id, screen: 'Emergency' },
    priority: 'urgent',
  });
}

/**
 * Create low battery notification
 */
async function notifyLowBattery(userId, batteryPercent) {
  return createNotification({
    userId,
    type: 'low_battery',
    title: `⚡ Low Battery — ${batteryPercent}%`,
    body: 'Find a charging station nearby before your EV runs out of power!',
    data: { screen: 'Map' },
    priority: 'high',
  });
}

/**
 * Create van dispatched notification
 */
async function notifyVanDispatched(userId, vanRequest) {
  return createNotification({
    userId,
    type: 'van_dispatched',
    title: '🚐 Mobile Charger Dispatched',
    body: `A charging van is on its way. ETA: ~${vanRequest.estimatedArrivalMinutes} min`,
    data: { vanRequestId: vanRequest._id, screen: 'VanTracking' },
    priority: 'urgent',
  });
}

module.exports = {
  createNotification,
  notifyBookingConfirmed,
  notifyPaymentReceived,
  notifySOSTriggered,
  notifyLowBattery,
  notifyVanDispatched,
};
