/**
 * socketHandler.js — Socket.io event registrations for PowerRoute
 */
const { initSocket } = require('../services/socketService');

function registerSocketHandlers(io) {
  initSocket(io);
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'socket_handlers_registered' }));
}

module.exports = { registerSocketHandlers };
