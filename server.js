/**
 * server.js — PowerRoute API Entry Point v2
 *
 * Boots:
 *  1. Express app (from src/app.js) with full security stack
 *  2. MongoDB connection
 *  3. Socket.io real-time layer
 *  4. Background cron schedulers
 */
// Load environment variables
require('dotenv').config();
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const mongoose = require('mongoose');

const { validateEnv, port, nodeEnv } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');

validateEnv();

// ── Load Express App ──────────────────────────────────────────────────────────
let app;
try {
  app = require('./src/app');
  console.log(JSON.stringify({ ts: new Date().toISOString(), message: 'Loaded PowerRoute v2 modular app (src/app.js)' }));
} catch (err) {
  console.warn(JSON.stringify({ ts: new Date().toISOString(), message: 'src/app.js failed, using fallback', error: err.message }));
  const express = require('express');
  const cors = require('cors');
  const routes = require('./routes');
  const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
  app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.get('/', (_req, res) => res.json({ status: 'ok', service: 'PowerRoute API (fallback)' }));
  app.get('/api/health', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'degraded' }));
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
}

// ── Create HTTP + Socket.io Server ───────────────────────────────────────────
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006,http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Register socket event handlers
try {
  const { registerSocketHandlers } = require('./src/sockets/socketHandler');
  registerSocketHandlers(io);
} catch (err) {
  console.warn(JSON.stringify({ ts: new Date().toISOString(), message: 'Socket handlers not loaded', error: err.message }));
}

// ── Start Server ──────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDatabase();

    server.listen(port, () => {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        message: `🚀 PowerRoute API v2 listening on port ${port}`,
        env: nodeEnv,
        docs: `http://localhost:${port}/api/docs`,
        health: `http://localhost:${port}/api/health`,
      }));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(JSON.stringify({
          ts: new Date().toISOString(),
          message: `❌ Port ${port} is in use. Run: npx kill-port ${port} then restart.`,
          hint: 'You may have another nodemon/node instance running. Close the other terminal.',
          error: err.message,
        }));
        // Exit cleanly so nodemon doesn't keep retrying forever
        process.exit(1);
      } else {
        console.error(JSON.stringify({ ts: new Date().toISOString(), message: 'Server error', error: err.message }));
        process.exit(1);
      }
    });

    // Start cron jobs after DB is ready
    try {
      const { startCronJobs } = require('./src/cron/cronManager');
      startCronJobs();
    } catch (err) {
      console.warn(JSON.stringify({ ts: new Date().toISOString(), message: 'Cron jobs not started', error: err.message }));
    }

  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), message: 'Server failed to start', error: err.message }));
    process.exit(1);
  }
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), message: `Graceful shutdown: ${signal}` }));
  try {
    server.close(() => {
      console.log(JSON.stringify({ ts: new Date().toISOString(), message: 'HTTP server closed' }));
    });
    io.close();
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), message: 'Shutdown error', error: err.message }));
    process.exit(1);
  }
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();

module.exports = app;
