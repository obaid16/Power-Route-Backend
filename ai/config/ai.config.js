const {
  aiProvider,
  openaiApiKey,
  geminiApiKey,
  groqApiKey,
  openaiModel,
  geminiModel,
  groqModel,
  aiEmergencyBatteryThreshold,
  aiDefaultKwhPer100km,
} = require('../../config/env');

/**
 * Central AI module configuration (reads from root env).
 */
module.exports = {
  provider: aiProvider,
  openai: {
    apiKey: openaiApiKey,
    model: openaiModel,
    enabled: Boolean(openaiApiKey) && aiProvider === 'openai',
  },
  gemini: {
    apiKey: geminiApiKey,
    model: geminiModel,
    enabled: Boolean(geminiApiKey) && aiProvider === 'gemini',
  },
  groq: {
    apiKey: groqApiKey,
    model: groqModel,
    enabled: Boolean(groqApiKey) && aiProvider === 'groq',
  },
  emergencyBatteryThresholdPercent: aiEmergencyBatteryThreshold,
  defaultKwhPer100km: aiDefaultKwhPer100km,
  /** Grid / session average for demo cost math (local currency units). */
  defaultPricePerKwh: Number(process.env.AI_DEFAULT_PRICE_PER_KWH) || 0.35,
};
