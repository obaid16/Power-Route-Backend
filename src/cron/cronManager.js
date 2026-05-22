/**
 * cronManager.js — Background cron jobs for PowerRoute
 *
 * Jobs:
 *  1. Expire locked booking slots (every 5 min)
 *  2. Clean up old read notifications (daily at 2am)
 *  3. Low battery safety check broadcast (every 15 min)
 */
const cron = require('node-cron');

function log(msg, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), component: 'cron', message: msg, ...meta }));
}

function startCronJobs() {
  // ── Job 1: Expire locked booking slots every 5 minutes ─────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const Charger = require('../models/Charger');
      const ChargingStation = require('../models/ChargingStation');
      const { broadcastStationStatus } = require('../services/socketService');

      const now = new Date();
      const expiredBookings = await Booking.find({
        status: 'locked',
        slotLockedUntil: { $lt: now },
      }).select('_id charger station');

      if (expiredBookings.length === 0) return;

      log('slot_expiry_job', { expiring: expiredBookings.length });

      const stationIds = new Set();
      await Promise.all(expiredBookings.map(async (booking) => {
        await Booking.findByIdAndUpdate(booking._id, { status: 'expired' });
        await Charger.findByIdAndUpdate(booking.charger, { status: 'available', currentBooking: null });
        await ChargingStation.findByIdAndUpdate(booking.station, { $inc: { availableSlots: 1 } });
        stationIds.add(booking.station.toString());
      }));

      // Broadcast updated station statuses
      for (const stationId of stationIds) {
        const chargers = await Charger.find({ station: stationId }).select('portNumber status connectorType maxPowerKw');
        broadcastStationStatus(stationId, chargers);
      }

      log('slot_expiry_complete', { expired: expiredBookings.length });
    } catch (err) {
      log('slot_expiry_error', { error: err.message });
    }
  });

  // ── Job 2: Clean old read notifications daily at 2:00 AM ───────────────────
  cron.schedule('0 2 * * *', async () => {
    try {
      const Notification = require('../models/Notification');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({ isRead: true, createdAt: { $lt: thirtyDaysAgo } });
      log('notification_cleanup', { deleted: result.deletedCount });
    } catch (err) {
      log('notification_cleanup_error', { error: err.message });
    }
  });

  // ── Job 3: Check for stale active SOS alerts every 30 minutes ──────────────
  cron.schedule('*/30 * * * *', async () => {
    try {
      const SOSAlert = require('../models/SOSAlert');
      const { emitToAdmin } = require('../services/socketService');

      const activeAlerts = await SOSAlert.find({ status: 'active' })
        .populate('user', 'name phone')
        .select('user type location address createdAt');

      if (activeAlerts.length > 0) {
        emitToAdmin('sos:active_count', { count: activeAlerts.length, alerts: activeAlerts });
        log('sos_monitor', { activeCount: activeAlerts.length });
      }
    } catch (err) {
      log('sos_monitor_error', { error: err.message });
    }
  });

  // ── Job 4: Auto-complete expired active bookings daily at midnight ──────────
  cron.schedule('0 0 * * *', async () => {
    try {
      const Booking = require('../models/Booking');
      const Charger = require('../models/Charger');
      const now = new Date();

      const overdueBookings = await Booking.find({
        status: 'active',
        estimatedEndAt: { $lt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // 2h overdue
      });

      await Promise.all(overdueBookings.map(async (booking) => {
        booking.status = 'completed';
        booking.completedAt = now;
        await booking.save();
        await Charger.findByIdAndUpdate(booking.charger, { status: 'available', currentBooking: null });
        await require('../models/ChargingStation').findByIdAndUpdate(booking.station, { $inc: { availableSlots: 1 } });
      }));

      if (overdueBookings.length > 0) {
        log('auto_complete_bookings', { completed: overdueBookings.length });
      }
    } catch (err) {
      log('auto_complete_error', { error: err.message });
    }
  });

  log('cron_jobs_started', {
    jobs: ['slot_expiry:*/5min', 'notification_cleanup:daily@2am', 'sos_monitor:*/30min', 'auto_complete_bookings:daily@midnight'],
  });
}

module.exports = { startCronJobs };
