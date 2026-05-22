/**
 * routes/index.js — PowerRoute Master API Router (v2)
 */
const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const stationRoutes = require('./stations');
const bookingRoutes = require('./bookings');
const paymentRoutes = require('./payments');
const walletRoutes = require('./wallet');
const notificationRoutes = require('./notifications');
const emergencyRoutes = require('./emergency');
const reviewRoutes = require('./reviews');

// Legacy route compat — proxy to original flat routes
let legacyAiRoutes, legacyMapRoutes, legacyAnalyticsRoutes, legacyWomenSafetyRoutes, legacyVanRoutes;
try { legacyAiRoutes = require('../../routes/aiRoutes'); } catch {}
try { legacyMapRoutes = require('../../routes/mapRoutes'); } catch {}
try { legacyAnalyticsRoutes = require('../../routes/analyticsRoutes'); } catch {}
try { legacyWomenSafetyRoutes = require('../../routes/womenSafetyRoutes'); } catch {}
try { legacyVanRoutes = require('../../routes/vanRoutes'); } catch {}

const router = express.Router();

// ── Core Routes ───────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stations', stationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallet', walletRoutes);
router.use('/notifications', notificationRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/reviews', reviewRoutes);

// ── Legacy Pass-through (backward compat) ─────────────────────────────────────
if (legacyAiRoutes) router.use('/ai', legacyAiRoutes);
if (legacyMapRoutes) router.use('/map', legacyMapRoutes);
if (legacyAnalyticsRoutes) router.use('/analytics', legacyAnalyticsRoutes);
if (legacyWomenSafetyRoutes) router.use('/women-safety', legacyWomenSafetyRoutes);
if (legacyVanRoutes) router.use('/vans', legacyVanRoutes);

module.exports = router;
