const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { verifyToken, getBearerTokenFromRequest } = require('../utils/jwt');

/**
 * JWT authentication: verifies Bearer token, loads user, sets `req.user`.
 * Use on any route that requires a logged-in user.
 */
const protect = catchAsync(async (req, res, next) => {
  const token = getBearerTokenFromRequest(req);
  if (!token) {
    return next(new AppError('You are not logged in. Please provide a valid Bearer token.', 401));
  }
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }
  req.user = user;
  next();
});

/** Same behavior as `protect` (common alternate name). */
const authenticate = protect;

/**
 * If a valid Bearer token is present, sets `req.user`; otherwise continues without error.
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  const token = getBearerTokenFromRequest(req);
  if (!token) return next();
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch {
    // Invalid or expired token — treat as anonymous
  }
  next();
});

module.exports = { protect, authenticate, optionalAuth };
