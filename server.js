require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { validateEnv, port, nodeEnv } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

validateEnv();

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

/** Root URL — there is no SPA here; use `/api` and `/api/health`. */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    service: 'Power Route API',
    message: 'API is running. There is no route at the site root; use the paths below.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth (signup, login, me)',
      ai: '/api/ai (predict-range, recommend-station, chat, …)',
    },
    docs: 'See backend/ai/README.md for AI routes.',
  });
});

app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'Power Route API',
    env: nodeEnv,
    database: { connected: dbOk, readyState: mongoose.connection.readyState },
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

let server;

async function start() {
  try {
    await connectDatabase();
    server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ ts: new Date().toISOString(), message: `Power Route API listening on port ${port}` }));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // eslint-disable-next-line no-console
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            message: `Port ${port} is already in use by another process. Please close the other process or check zombie Node tasks.`,
            error: err.message,
          })
        );
        process.exit(1);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        message: 'Server failed to start (database unavailable)',
        error: err.message,
      })
    );
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), message: `Shutdown: ${signal}` }));
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((e) => (e ? reject(e) : resolve()));
      });
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ ts: new Date().toISOString(), message: 'Shutdown error', error: err.message }));
    process.exit(1);
  }
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

start();

module.exports = app;
