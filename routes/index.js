const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const stationRoutes = require('./stationRoutes');
const bookingRoutes = require('./bookingRoutes');
const aiRoutes = require('./aiRoutes');
const emergencyRoutes = require('./emergencyRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const womenSafetyRoutes = require('./womenSafetyRoutes');
const vanRoutes = require('./vanRoutes');
const serviceRoutes = require('./serviceRoutes');
const mapRoutes = require('./mapRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stations', stationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/ai', aiRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/women-safety', womenSafetyRoutes);
router.use('/vans', vanRoutes);
router.use('/services', serviceRoutes);
router.use('/map', mapRoutes);

module.exports = router;
