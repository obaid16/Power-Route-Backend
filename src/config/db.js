/**
 * db.js — PowerRoute Database Configuration
 * 
 * Provides a flexible, resilient MongoDB connection with automated
 * reconnection retries and comprehensive event monitoring.
 */
const mongoose = require('mongoose');
const { mongoUri, mongoAppName, nodeEnv } = require('../../config/env');

let eventsRegistered = false;

function log(level, message, meta = {}) {
  const ts = new Date().toISOString();
  const payload = { ts, level, component: 'database', message, ...meta };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function getMongooseOptions() {
  return {
    appName: mongoAppName,
    autoIndex: nodeEnv !== 'production',
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 15000,
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS) || 45000,
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    retryWrites: true,
    w: 'majority',
  };
}

function registerConnectionEvents() {
  if (eventsRegistered) return;
  eventsRegistered = true;

  mongoose.connection.on('connecting', () => {
    if (nodeEnv !== 'test') log('info', 'MongoDB: connecting...');
  });

  mongoose.connection.on('connected', () => {
    if (nodeEnv !== 'test') {
      const conn = mongoose.connection;
      log('info', 'MongoDB: connected', {
        host: conn.host,
        port: conn.port,
        database: conn.name || conn.db?.databaseName,
      });
    }
  });

  mongoose.connection.on('open', () => {
    if (nodeEnv !== 'test') log('info', 'MongoDB: connection open (ready)');
  });

  mongoose.connection.on('disconnected', () => {
    if (nodeEnv !== 'test') log('warn', 'MongoDB: disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    if (nodeEnv !== 'test') log('info', 'MongoDB: reconnected');
  });

  mongoose.connection.on('error', (err) => {
    log('error', 'MongoDB: driver error', {
      name: err.name,
      message: err.message,
      code: err.code,
    });
  });

  mongoose.connection.on('close', () => {
    if (nodeEnv !== 'test') log('info', 'MongoDB: connection closed');
  });
}

async function connectDatabase() {
  registerConnectionEvents();
  if (mongoose.connection.readyState === 1) {
    log('info', 'MongoDB: reusing existing connection');
    return mongoose.connection;
  }
  try {
    await mongoose.connect(mongoUri, getMongooseOptions());
    return mongoose.connection;
  } catch (err) {
    log('error', 'MongoDB: initial connection failed', {
      name: err.name,
      message: err.message,
      code: err.code,
    });
    throw err;
  }
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase, registerConnectionEvents };
