/**
 * userMapper.js — PowerRoute
 * Safe serialisers — never expose password or OTP fields.
 */

function toVehicleProfile(user) {
  if (!user) return null;
  return {
    evVehicleModel:        user.evVehicleModel        || '',
    batteryCapacityKwh:    user.batteryCapacityKwh    || 0,
    chargerType:           user.chargerType           || '',
    currentBatteryPercent: user.currentBatteryPercent || 0,
  };
}

/** Safe user object for auth / profile responses (no password, no OTP). */
function toAuthUser(user) {
  if (!user) return null;
  return {
    id:              String(user._id),
    name:            user.name,
    email:           user.email,
    phone:           user.phone           || '',
    isEmailVerified: Boolean(user.isEmailVerified),
    vehicle:         toVehicleProfile(user),
    createdAt:       user.createdAt,
    updatedAt:       user.updatedAt,
  };
}

module.exports = { toVehicleProfile, toAuthUser };
