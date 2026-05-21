const { GoogleGenAI } = require('@google/genai');
const AppError = require('../../../utils/AppError');
const aiConfig = require('../../config/ai.config');

async function generateContent({ contents, model }) {
  if (!aiConfig.gemini.enabled) {
    throw new AppError('Gemini is not configured (set AI_PROVIDER=gemini and GEMINI_API_KEY)', 503);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: aiConfig.gemini.apiKey });
    const prompt = contents.map(m => m.content).join('\n\n');

    const response = await ai.models.generateContent({
      model: model || aiConfig.gemini.model,
      contents: prompt,
    });

    return {
      text: response.text,
      model: model || aiConfig.gemini.model,
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw new AppError('AI Generation failed: ' + error.message, 500);
  }
}

module.exports = { generateContent };
