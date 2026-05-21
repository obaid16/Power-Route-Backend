const aiConfig = require('../config/ai.config');
const openaiProvider = require('./providers/openaiProvider');
const geminiProvider = require('./providers/geminiProvider');
const groqProvider = require('./providers/groqProvider');

/**
 * Single entry for future LLM-backed features (chat upgrade, intent, etc.).
 */
async function generateAssistantReply(messages) {
  // Try OpenAI provider
  if (aiConfig.provider === 'openai' && aiConfig.openai.enabled) {
    try {
      const out = await openaiProvider.completeChat({ messages });
      return { provider: 'openai', text: out.text };
    } catch (err) {
      console.error('OpenAI provider error, falling back to mock:', err.message);
    }
  }

  // Try Gemini provider
  if (aiConfig.provider === 'gemini' && aiConfig.gemini.enabled) {
    try {
      const out = await geminiProvider.generateContent({ contents: messages });
      return { provider: 'gemini', text: out.text };
    } catch (err) {
      console.error('Gemini provider error, falling back to mock:', err.message);
    }
  }

  // Try Groq provider
  if (aiConfig.provider === 'groq' && aiConfig.groq.enabled) {
    try {
      const out = await groqProvider.completeChat({ messages });
      return { provider: 'groq', text: out.text };
    } catch (err) {
      console.error('Groq provider error, falling back to mock:', err.message);
    }
  }

  // Default to mock provider
  return { provider: 'mock', text: null };
}

module.exports = { generateAssistantReply };
