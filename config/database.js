const mongoose = require('mongoose');
const { mongoUri, mongoAppName, nodeEnv } = require('./env');
const { sanitizeMongoUri } = require('../utils/sanitizeMongoUri');

let eventsRegistered = false;

function log(level, message, meta = {}) {
  const ts = new Date().toISOString();
  const payload = { ts, level, message, ...meta };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

/**
 * Mongoose options tuned for MongoDB Atlas (SRV + replica sets) and local dev.
 * @see https://mongoosejs.com/docs/connections.html#options
 */
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

function onConnectionEvents() {
  if (eventsRegistered) return;
  eventsRegistered = true;

  mongoose.connection.on('connecting', () => {
    if (nodeEnv === 'test') return;
    log('info', 'MongoDB: connecting', { uri: sanitizeMongoUri(mongoUri) });
  });

  mongoose.connection.on('connected', () => {
    if (nodeEnv === 'test') return;
    const conn = mongoose.connection;
    log('info', 'MongoDB: connected', {
      host: conn.host,
      port: conn.port,
      database: conn.name || conn.db?.databaseName,
      readyState: conn.readyState,
    });
  });

  mongoose.connection.on('open', () => {
    if (nodeEnv === 'test') return;
    log('info', 'MongoDB: connection open (ready for operations)');
  });

  mongoose.connection.on('disconnected', () => {
    if (nodeEnv === 'test') return;
    log('warn', 'MongoDB: disconnected', { readyState: mongoose.connection.readyState });
  });

  mongoose.connection.on('reconnected', () => {
    if (nodeEnv === 'test') return;
    log('info', 'MongoDB: reconnected after temporary network issue');
  });

  mongoose.connection.on('error', (err) => {
    log('error', 'MongoDB: driver connection error', {
      name: err.name,
      message: err.message,
      code: err.code,
      ...(nodeEnv === 'development' ? { stack: err.stack } : {}),
    });
  });

  mongoose.connection.on('close', () => {
    if (nodeEnv === 'test') return;
    log('info', 'MongoDB: connection closed');
  });
}

async function connectDatabase() {
  onConnectionEvents();
  if (mongoose.connection.readyState === 1) {
    log('info', 'MongoDB: reuse existing connection');
    return mongoose.connection;
  }
  try {
    await mongoose.connect(mongoUri, getMongooseOptions());
    return mongoose.connection;
  } catch (err) {
    log('error', 'MongoDB: initial connection failed', {
      uri: sanitizeMongoUri(mongoUri),
      name: err.name,
      message: err.message,
      code: err.code,
      ...(nodeEnv === 'development' ? { stack: err.stack } : {}),
    });
    throw err;
  }
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  onConnectionEvents,
};
