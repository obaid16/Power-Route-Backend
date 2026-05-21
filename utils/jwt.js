const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const JWT_ALGORITHM = 'HS256';

/**
 * @param {string} authorizationHeader - Raw `Authorization` header value
 * @returns {string|null} Token or null if missing / not Bearer
 */
function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') return null;
  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1] || null;
}

/**
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getBearerTokenFromRequest(req) {
  return parseBearerToken(req.headers.authorization);
}

function signToken(userId) {
  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: jwtExpiresIn,
    algorithm: JWT_ALGORITHM,
  });
}

function verifyToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] });
}

module.exports = {
  signToken,
  verifyToken,
  parseBearerToken,
  getBearerTokenFromRequest,
  JWT_ALGORITHM,
};
