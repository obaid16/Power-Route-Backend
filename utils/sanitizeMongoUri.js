/**
 * Redacts password in MongoDB URIs for safe logs (local + Atlas srv).
 */
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '(not set)';
  return uri.replace(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1$2:***@');
}

module.exports = { sanitizeMongoUri };
