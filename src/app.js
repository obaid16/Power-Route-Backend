/**
 * app.js — PowerRoute Express Application Bootstrapper
 *
 * Configures Express with full security stack (Helmet, rate limiting,
 * mongo sanitization, CORS, cookie parsing) and mounts all API routes.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./config/swagger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, true); // Permissive in dev; tighten in production
    }
  },
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ── Mongo NoSQL Injection Prevention ──────────────────────────────────────────
app.use(mongoSanitize());

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many auth attempts, try again later.' },
});
app.use('/api/auth', authLimiter);

// ── API Docs ──────────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PowerRoute API Docs',
}));

// ── Root & Health ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'PowerRoute API v2',
    message: 'API is running. Use /api for endpoints, /api/docs for documentation.',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs',
      auth: '/api/auth',
      stations: '/api/stations',
      bookings: '/api/bookings',
      payments: '/api/payments',
      wallet: '/api/wallet',
      emergency: '/api/emergency',
      admin: '/api/admin',
    },
  });
});

app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'PowerRoute API v2',
    env: process.env.NODE_ENV || 'development',
    database: { connected: dbOk, readyState: mongoose.connection.readyState },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Mount API Routes ──────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Legacy route support (backward compat with old flat structure) ────────────
try {
  const legacyRoutes = require('../routes');
  app.use('/api', legacyRoutes);
} catch (e) {
  // Legacy routes not available — that's fine
}

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
