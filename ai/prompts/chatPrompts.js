/**
 * System / developer prompts for future LLM wiring (OpenAI / Gemini).
 * Runtime chat may concatenate these with user message + JSON context.
 */

const EV_ASSISTANT_SYSTEM = `You are Power Route EV Assistant, a concise expert on EV charging, range, and battery care.
Rules:
- Prefer short bullet answers when listing options.
- Never invent real-time station availability; say when data is unknown.
- Use metric units unless the user asks otherwise.
- If asked for medical or legal advice, decline and redirect to appropriate professionals.`;

const INTENT_CLASSIFIER_DEV = `Classify the user message into one of: nearest_station, range_capability, charging_recommendation, battery_health, smalltalk, unknown.
Reply as JSON: {"intent":"...","confidence":0-1}`;

function buildChatUserPrompt({ userName, batteryPercent, capacityKwh, chargerType, extraContext }) {
  const lines = [
    `Driver: ${userName || 'EV user'}`,
    `Battery: ${batteryPercent}%`,
    `Pack size: ${capacityKwh} kWh (if known)`,
    `Preferred connector: ${chargerType || 'unspecified'}`,
  ];
  if (extraContext) lines.push(`Context: ${extraContext}`);
  return lines.join('\n');
}

module.exports = {
  EV_ASSISTANT_SYSTEM,
  INTENT_CLASSIFIER_DEV,
  buildChatUserPrompt,
};
