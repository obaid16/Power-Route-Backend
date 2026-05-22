/**
 * jwt.js — JWT token utilities for access + refresh tokens
 */
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');

const JWT_ALGORITHM = 'HS256';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || jwtSecret + '_refresh';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') return null;
  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1] || null;
}

function getBearerTokenFromRequest(req) {
  return parseBearerToken(req.headers.authorization);
}

function signAccessToken(userId, role = 'user') {
  return jwt.sign({ id: userId, role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
    algorithm: JWT_ALGORITHM,
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId, type: 'refresh' }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: [JWT_ALGORITHM] });
}

// Backward compat aliases
const signToken = signAccessToken;
const verifyToken = verifyAccessToken;

module.exports = {
  signToken,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  parseBearerToken,
  getBearerTokenFromRequest,
  JWT_ALGORITHM,
};
