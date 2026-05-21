require('dotenv').config();

const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnv() {
  if (process.env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
  }
}

module.exports = {
  validateEnv,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  /** MongoDB connection string (local or Atlas `mongodb+srv://...`). */
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/powerroute',
  /** Optional; sent to the driver as `appName` for Atlas cluster metrics. */
  mongoAppName: process.env.MONGODB_APP_NAME || 'Power Route API',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  /** Open Charge Map — register at https://openchargemap.org/site/develop/api */
  ocmApiKey: (process.env.OCM_API_KEY || '').trim(),
  /** Base URL for POI endpoint (must end with path usable with query string). */
  ocmApiBaseUrl: process.env.OCM_API_BASE_URL || 'https://api.openchargemap.io/v3/poi/',
  /** AI module: `mock` | `openai` | `gemini` (mock uses heuristics until keys are set). */
  aiProvider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
  openaiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  googleMapsApiKey: (process.env.GOOGLE_MAPS_API_KEY || '').trim(),
  orsApiKey: (process.env.ORS_API_KEY || '').trim(),
  geoapifyApiKey: (process.env.GEOAPIFY_API_KEY || '').trim(),
  groqApiKey: (process.env.GROQ_API_KEY || '').trim(),
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  /** Triggers emergency-style responses in `/api/ai/emergency-detection` when below this %. */
  aiEmergencyBatteryThreshold: Number(process.env.AI_EMERGENCY_BATTERY_THRESHOLD) || 15,
  /** Default consumption assumption (kWh/100 km) when not supplied by client. */
  aiDefaultKwhPer100km: Number(process.env.AI_DEFAULT_KWH_PER_100KM) || 18,
  ocmApiKey: (process.env.OCM_API_KEY || '').trim(),
  ocmApiBaseUrl: process.env.OCM_API_BASE_URL || 'https://api.openchargemap.io/v3/poi/',
};
