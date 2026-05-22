/**
 * socketService.js — Socket.io event registry and broadcast helpers
 * 
 * Rooms:
 *   station:{id}     - Live charger status for a station
 *   trip:{id}        - Live position updates for a trip
 *   user:{id}        - Personal notifications
 *   sos:broadcast    - SOS alerts to all monitors/admins
 *   admin:dashboard  - Real-time admin stats
 */

let io;

function initSocket(socketIo) {
  io = socketIo;

  io.on('connection', (socket) => {
    const log = (msg, meta = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), event: msg, socketId: socket.id, ...meta }));

    log('socket_connected');

    // ── Room joining ──────────────────────────────────────────────────────────
    socket.on('join:station', ({ stationId }) => {
      socket.join(`station:${stationId}`);
      log('join_station', { stationId });
    });

    socket.on('leave:station', ({ stationId }) => {
      socket.leave(`station:${stationId}`);
    });

    socket.on('join:trip', ({ tripId }) => {
      socket.join(`trip:${tripId}`);
      log('join_trip', { tripId });
    });

    socket.on('leave:trip', ({ tripId }) => {
      socket.leave(`trip:${tripId}`);
    });

    socket.on('join:user', ({ userId }) => {
      socket.join(`user:${userId}`);
      log('join_user', { userId });
    });

    socket.on('join:admin', () => {
      socket.join('admin:dashboard');
      log('join_admin');
    });

    // ── Live Location Updates (from van driver / user) ─────────────────────────
    socket.on('location:update', ({ roomType, roomId, coordinates, meta = {} }) => {
      const room = `${roomType}:${roomId}`;
      socket.to(room).emit('location:updated', {
        coordinates,
        timestamp: new Date().toISOString(),
        ...meta,
      });
    });

    // ── SOS Trigger ────────────────────────────────────────────────────────────
    socket.on('sos:trigger', (payload) => {
      io.to('sos:broadcast').emit('sos:incoming', {
        ...payload,
        timestamp: new Date().toISOString(),
      });
      log('sos_triggered', { userId: payload.userId });
    });

    socket.on('disconnect', (reason) => {
      log('socket_disconnected', { reason });
    });
  });
}

// ── Broadcast helpers (called from controllers) ───────────────────────────────

function emitToStation(stationId, event, data) {
  if (!io) return;
  io.to(`station:${stationId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
}

function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
}

function emitToTrip(tripId, event, data) {
  if (!io) return;
  io.to(`trip:${tripId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
}

function broadcastSOS(sosData) {
  if (!io) return;
  io.to('sos:broadcast').emit('sos:incoming', { ...sosData, timestamp: new Date().toISOString() });
}

function emitToAdmin(event, data) {
  if (!io) return;
  io.to('admin:dashboard').emit(event, { ...data, timestamp: new Date().toISOString() });
}

function broadcastStationStatus(stationId, chargerUpdates) {
  emitToStation(stationId, 'station:status_update', { stationId, chargers: chargerUpdates });
}

function getIO() { return io; }

module.exports = {
  initSocket,
  getIO,
  emitToStation,
  emitToUser,
  emitToTrip,
  broadcastSOS,
  emitToAdmin,
  broadcastStationStatus,
};
