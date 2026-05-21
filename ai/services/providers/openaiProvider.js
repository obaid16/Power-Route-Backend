/**
 * Placeholder OpenAI client — swap in `openai` npm package when ready.
 * @see https://platform.openai.com/docs/api-reference
 */

const AppError = require('../../../utils/AppError');
const aiConfig = require('../../config/ai.config');

async function completeChat({ messages, model, temperature = 0.3 }) {
  if (!aiConfig.openai.enabled) {
    throw new AppError('OpenAI is not configured (set AI_PROVIDER=openai and OPENAI_API_KEY)', 503);
  }
  // Future: const OpenAI = require('openai'); ...
  return {
    text: '[OpenAI stub] Wire the official SDK and return `choices[0].message.content`.',
    model: model || aiConfig.openai.model,
    usage: null,
  };
}

module.exports = { completeChat };
