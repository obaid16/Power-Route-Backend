/**
 * emergencyController.js — SOS alerts, emergency contacts, live trip sharing
 */
const SOSAlert = require('../models/SOSAlert');
const EmergencyContact = require('../models/EmergencyContact');
const LiveTrip = require('../models/LiveTrip');
const ChargingStation = require('../models/ChargingStation');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');
const { broadcastSOS, emitToUser } = require('../services/socketService');
const { notifySOSTriggered } = require('../services/notificationService');
const { sendSOSAlertEmail } = require('../services/emailService');

// ── Trigger SOS Alert ──────────────────────────────────────────────────────────
const triggerSOS = catchAsync(async (req, res) => {
  const { type = 'other', coordinates, address, batteryPercent, message, tripId } = req.body;
  const userId = req.user._id;

  if (!coordinates || coordinates.length !== 2) throw new AppError('Valid coordinates [lng, lat] are required', 400);

  // Find nearby stations to dispatch
  const nearbyStations = await ChargingStation.find({
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates },
        $maxDistance: 5000, // 5km
      },
    },
    isActive: true,
    isEmergencyCapable: true,
  }).limit(3).select('_id stationName');

  const sos = await SOSAlert.create({
    user: userId,
    trip: tripId,
    type,
    status: 'active',
    location: { type: 'Point', coordinates },
    address,
    batteryPercentAtSOS: batteryPercent,
    message,
    nearbyStations: nearbyStations.map((s) => s._id),
  });

  // Broadcast via Socket.io to all monitors
  const user = req.user;
  broadcastSOS({
    sosId: sos._id,
    userId,
    userName: user.name,
    type,
    coordinates,
    address,
    batteryPercent,
    message,
  });

  // Notify user
  await notifySOSTriggered(userId, sos);

  // Alert emergency contacts via email
  const contacts = await EmergencyContact.find({ user: userId }).sort({ alertPriority: 1 }).limit(5);
  const alertPromises = contacts
    .filter((c) => c.receivesEmail && c.email)
    .map((c) =>
      sendSOSAlertEmail(c.email, {
        userName: user.name,
        address,
        batteryPercent,
        type,
      }).catch(() => {}) // Non-blocking
    );

  await Promise.allSettled(alertPromises);

  // Update SOS with notified contacts
  sos.notifiedContacts = contacts.map((c) => ({
    contact: c._id,
    notifiedAt: new Date(),
    method: 'email',
  }));
  await sos.save();

  sendSuccess(res, 201, 'SOS alert activated! Emergency contacts notified.', {
    sosId: sos._id,
    nearbyStations: nearbyStations.map((s) => ({ id: s._id, name: s.stationName })),
    contactsNotified: contacts.length,
  });
});

// ── Resolve SOS Alert ────────────────────────────────────────────────────────
const resolveSOS = catchAsync(async (req, res) => {
  const { sosId } = req.params;
  const { resolution = 'User marked as resolved' } = req.body;

  const sos = await SOSAlert.findOne({ _id: sosId, user: req.user._id });
  if (!sos) throw new AppError('SOS alert not found', 404);
  if (!['active', 'acknowledged'].includes(sos.status)) throw new AppError('SOS is already resolved', 400);

  sos.status = 'resolved';
  sos.resolvedAt = new Date();
  sos.resolvedBy = req.user._id;
  sos.resolutionNote = resolution;
  await sos.save();

  emitToUser(req.user._id.toString(), 'sos:resolved', { sosId });

  sendSuccess(res, 200, 'SOS resolved.', { sosId });
});

// ── Get My SOS Alerts ─────────────────────────────────────────────────────────
const getMySOS = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [alerts, total] = await Promise.all([
    SOSAlert.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    SOSAlert.countDocuments(query),
  ]);

  sendPaginated(res, 200, 'SOS alerts fetched.', alerts, { page: parseInt(page), limit: parseInt(limit), total });
});

// ── Emergency Contacts CRUD ───────────────────────────────────────────────────
const getContacts = catchAsync(async (req, res) => {
  const contacts = await EmergencyContact.find({ user: req.user._id }).sort({ alertPriority: 1 });
  sendSuccess(res, 200, 'Emergency contacts fetched.', { contacts });
});

const addContact = catchAsync(async (req, res) => {
  const count = await EmergencyContact.countDocuments({ user: req.user._id });
  if (count >= 10) throw new AppError('Maximum 10 emergency contacts allowed', 400);

  const contact = await EmergencyContact.create({ ...req.body, user: req.user._id });
  sendSuccess(res, 201, 'Emergency contact added.', { contact });
});

const updateContact = catchAsync(async (req, res) => {
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: req.params.contactId, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!contact) throw new AppError('Contact not found', 404);
  sendSuccess(res, 200, 'Emergency contact updated.', { contact });
});

const deleteContact = catchAsync(async (req, res) => {
  const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.contactId, user: req.user._id });
  if (!contact) throw new AppError('Contact not found', 404);
  sendSuccess(res, 200, 'Emergency contact deleted.');
});

// ── All Active SOS Alerts (Admin) ─────────────────────────────────────────────
const getActiveSOS = catchAsync(async (req, res) => {
  const alerts = await SOSAlert.find({ status: { $in: ['active', 'acknowledged'] } })
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .limit(50);
  sendSuccess(res, 200, 'Active SOS alerts.', { alerts, count: alerts.length });
});

module.exports = { triggerSOS, resolveSOS, getMySOS, getContacts, addContact, updateContact, deleteContact, getActiveSOS };
