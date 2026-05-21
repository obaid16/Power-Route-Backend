const EmergencyAlert = require('../models/EmergencyAlert');
const ChargingStation = require('../models/ChargingStation');
const User = require('../models/User');

async function createAlert(userId, type, lat, lng, message = '') {
  return EmergencyAlert.create({
    user: userId,
    type,
    location: { type: 'Point', coordinates: [lng, lat] },
    message,
  });
}

async function findNearestEmergencyStation(lat, lng) {
  const [doc] = await ChargingStation.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        spherical: true,
        query: { isEmergencyCapable: true },
      },
    },
    { $limit: 5 },
  ]);
  return doc || null;
}

async function updateUserLiveLocation(userId, lat, lng) {
  return User.findByIdAndUpdate(
    userId,
    { lastKnownLocation: { type: 'Point', coordinates: [lng, lat] } },
    { new: true }
  ).select('lastKnownLocation name email');
}

module.exports = {
  createAlert,
  findNearestEmergencyStation,
  updateUserLiveLocation,
};
