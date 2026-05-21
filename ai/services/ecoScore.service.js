const User = require('../../models/User');

/**
 * Mock eco scoring from profile + timestamps (replace with trip logs later).
 */
async function computeEcoScoreForUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const pct = Number(user.currentBatteryPercent) || 50;
  const cap = Number(user.batteryCapacityKwh) || 60;

  // Pseudo-variance from email hash length — stable per user for demos
  const salt = (user.email || '').length % 7;
  const ecoDrivingScore = Math.min(100, Math.round(72 + salt * 2 + (pct > 20 ? 6 : 0)));
  const energyEfficiency = Math.min(100, Math.round(68 + (cap > 70 ? 8 : 0) + salt));
  const gridCarbonGPerKwh = 350;
  const assumedAnnualKm = 12000;
  const kwhPer100km = 18;
  const annualKwh = (assumedAnnualKm / 100) * kwhPer100km;
  const iceLPer100km = 6.5;
  const iceCo2KgPerL = 2.31;
  const avoidedIceTonnes = Math.round(((assumedAnnualKm / 100) * iceLPer100km * iceCo2KgPerL) / 1000 * 100) / 100;
  const carbonSavingsKgPerYear = Math.round(annualKwh * (gridCarbonGPerKwh / 1000) * 0.12 * 10) / 10;

  return {
    userId: String(user._id),
    ecoDrivingScore,
    energyEfficiency,
    carbonSavings: {
      avoidedGasolineCo2TonnesPerYear: avoidedIceTonnes,
      estimatedGridEmissionsOffsetKgPerYear: carbonSavingsKgPerYear,
      note: 'Illustrative comparison vs a gasoline reference; methodology is hackathon-grade.',
    },
    meta: {
      computedAt: new Date().toISOString(),
      model: 'mock_eco_v1',
    },
  };
}

module.exports = { computeEcoScoreForUser };
