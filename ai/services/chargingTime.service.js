const aiConfig = require('../config/ai.config');

const CHARGER_PROFILES = {
  'ac-home': { maxKw: 7.4, label: 'AC home (7.4 kW)' },
  'ac-public': { maxKw: 11, label: 'AC public (11 kW)' },
  'dc-50': { maxKw: 50, label: 'DC 50 kW' },
  'dc-150': { maxKw: 150, label: 'DC 150 kW' },
  'dc-350': { maxKw: 350, label: 'DC 350 kW' },
};

function resolveCharger(chargerType) {
  const key = String(chargerType || '').toLowerCase();
  return CHARGER_PROFILES[key] || { maxKw: 50, label: `Unknown type (${chargerType}), assumed 50 kW` };
}

/**
 * Simple session model: average power ramps down above 80% SoC (mock taper).
 */
function estimateSessionHours(energyKwh, maxKw) {
  let hours = 0;
  let remaining = energyKwh;
  let power = maxKw;
  const slice = 0.25; // hours
  while (remaining > 0.01 && hours < 48) {
    const socProxy = 1 - remaining / Math.max(energyKwh, 0.01);
    if (socProxy > 0.8) power = maxKw * 0.55;
    else if (socProxy > 0.65) power = maxKw * 0.78;
    else power = maxKw;
    const delivered = Math.min(remaining, power * slice);
    remaining -= delivered;
    hours += slice;
  }
  return hours;
}

function estimateChargingSession(input) {
  const {
    chargerType,
    batteryCapacityKwh,
    currentBatteryPercent,
    targetBatteryPercent,
    pricePerKwh = aiConfig.defaultPricePerKwh,
  } = input;

  const cap = Number(batteryCapacityKwh);
  const cur = Number(currentBatteryPercent);
  const tgt = Number(targetBatteryPercent);
  const deltaPct = Math.max(0, tgt - cur);
  const energyKwh = (deltaPct / 100) * cap;
  const profile = resolveCharger(chargerType);
  const hours = estimateSessionHours(energyKwh, profile.maxKw);
  const minutes = Math.round(hours * 60);
  const cost = Math.round(energyKwh * Number(pricePerKwh) * 100) / 100;

  return {
    chargerTypeProfile: profile.label,
    maxPowerKw: profile.maxKw,
    energyToDeliverKwh: Math.round(energyKwh * 100) / 100,
    estimatedChargingTimeMinutes: minutes,
    estimatedCost: cost,
    currency: 'LOCAL_UNITS',
    assumptions: {
      taperModel: 'mock_piecewise',
      pricePerKwh,
    },
    model: 'mock_session_v1',
  };
}

module.exports = {
  estimateChargingSession,
  CHARGER_PROFILES,
};
