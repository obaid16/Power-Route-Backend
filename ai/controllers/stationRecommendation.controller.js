const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const { aiSuccess } = require('../utils/apiResponse');
const { recommendStationResolved } = require('../services/stationRecommendation.service');
const aiConfig = require('../config/ai.config');

const recommendStation = catchAsync(async (req, res) => {
  const batteryPct =
    req.body.batteryPercentage != null ? Number(req.body.batteryPercentage) : Number(req.user.currentBatteryPercent);

  const ranked = await recommendStationResolved(
    {
      userLocation: req.body.userLocation,
      batteryPercentage: batteryPct,
      nearbyChargingStations: req.body.nearbyChargingStations,
      chargerCompatibility: req.body.chargerCompatibility,
      trafficConditions: req.body.trafficConditions,
      kwhPer100km: req.body.kwhPer100km,
      radiusKm: req.body.radiusKm,
      vehicleBatteryCapacityKwh: req.body.vehicleBatteryCapacityKwh,
    },
    req.user
  );

  const { bestChargingStation, backupChargingStation, ranked: list } = ranked;

  if (!list || list.length === 0) {
    throw new AppError(
      'No usable charging stations (with coordinates) were found. Add nearbyChargingStations or seed stations near userLocation.',
      404
    );
  }

  return aiSuccess(
    res,
    200,
    'smart_charging_station_recommendation',
    {
      bestChargingStation,
      backupChargingStation,
      estimatedArrivalBatteryPercent: bestChargingStation?.estimatedArrivalBatteryPercent ?? null,
      chargingCostEstimateBest: bestChargingStation?.chargingCostEstimate ?? null,
      alternatives: list,
    },
    { provider: aiConfig.provider }
  );
});

module.exports = { recommendStation };
