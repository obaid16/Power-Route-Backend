const { haversineKm } = require('../../utils/geo');
const stationService = require('../../services/stationService');
const { predictRangeFromUser } = require('./rangePrediction.service');
const { EV_ASSISTANT_SYSTEM, buildChatUserPrompt } = require('../prompts/chatPrompts');
const llmClient = require('./llmClient.service');
const aiConfig = require('../config/ai.config');

function mockReply(message, user) {
  const m = String(message).toLowerCase();
  if (m.includes('nearest') && m.includes('charg')) {
    return 'To find the nearest charger, share your GPS in the app map screen or ask: “stations near me”. I can rank compatible plugs once I have lat/lng.';
  }
  if (m.includes('range') || m.includes('how far')) {
    const p = predictRangeFromUser(user);
    return `Rough range estimate with your profile: about ${p.estimatedRangeKm} km under demo assumptions (${p.assumptions.kwhPer100km} kWh/100 km).`;
  }
  if (m.includes('health') || m.includes('battery care')) {
    return 'Battery health tips: avoid sitting at 100% for long periods daily, precondition before fast charging in cold weather, and follow OEM DC charge guidance.';
  }
  if (m.includes('cost') || m.includes('price') || m.includes('cheap')) {
    return 'For charging cost, compare pricePerKwh at stations and your target SoC window; I can estimate a session once you pick a charger type and target %.';
  }
  return `I'm Power Route EV Assistant (mock mode). Ask about nearest charging, range, charging plans, or battery care. (${aiConfig.provider} provider; set OPENAI_API_KEY or GEMINI_API_KEY to upgrade.)`;
}

/**
 * Optional async upgrade path when LLM keys exist.
 */
async function answerChat({ message, user, context }) {
  const safeUser = user || {
    name: 'Guest',
    currentBatteryPercent: 50,
    batteryCapacityKwh: 60,
    chargerType: 'type2',
  };

  const system = EV_ASSISTANT_SYSTEM;
  const userBlock = buildChatUserPrompt({
    userName: safeUser.name,
    batteryPercent: safeUser.currentBatteryPercent,
    capacityKwh: safeUser.batteryCapacityKwh,
    chargerType: safeUser.chargerType,
    extraContext: context,
  });



  const llm = await llmClient.generateAssistantReply([
    { role: 'system', content: system },
    { role: 'user', content: `${userBlock}\n\nUser message:\n${message}` },
  ]);

  if (llm.text && llm.provider !== 'mock') {
    return { reply: llm.text, provider: llm.provider, intents: ['llm'] };
  }

  return { reply: mockReply(message, safeUser), provider: 'mock', intents: ['heuristic'] };
}

async function enrichWithNearestStation(reply, user, lat, lng) {
  if (lat == null || lng == null) return { reply, nearestStation: null };
  const raw = await stationService.findNearbyStations(lat, lng, 20);
  const ranked = stationService.attachDistanceKm(raw, lat, lng);
  const top = ranked[0];
  if (!top) return { reply, nearestStation: null };
  const [slng, slat] = top.location.coordinates;
  const d = haversineKm(lat, lng, slat, slng);
  return {
    reply,
    nearestStation: { id: String(top._id), name: top.stationName, distanceKm: Math.round(d * 100) / 100 },
  };
}

module.exports = {
  answerChat,
  enrichWithNearestStation,
  mockReply,
};
