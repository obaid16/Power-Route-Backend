const Groq = require('groq-sdk');
const aiConfig = require('../../config/ai.config');

let client;
function getClient() {
  if (!client) {
    if (!aiConfig.groq.apiKey) {
      throw new Error('GROQ_API_KEY is missing');
    }
    client = new Groq({ apiKey: aiConfig.groq.apiKey });
  }
  return client;
}

/**
 * Standardized chat generation interface
 * @param {Object} input - { messages: Array<{role, content}> }
 */
async function completeChat({ messages }) {
  try {
    const groq = getClient();
    
    // Convert generic messages to Groq format
    const chatMessages = messages.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const response = await groq.chat.completions.create({
      messages: chatMessages,
      model: aiConfig.groq.model || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    return { text: response.choices[0]?.message?.content || '' };
  } catch (error) {
    console.error('[Groq Provider] Error generating chat:', error);
    throw error;
  }
}

module.exports = { completeChat };
