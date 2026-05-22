/**
 * auth.js — JWT Authentication + Role-Based Access Control Middleware
 */
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { verifyAccessToken, getBearerTokenFromRequest } = require('../utils/jwt');

// Lazy-load User model to avoid circular deps
let User;
function getUserModel() {
  if (!User) User = require('../models/User');
  return User;
}

/**
 * Protect route — requires valid JWT Bearer token
 */
const protect = catchAsync(async (req, res, next) => {
  const token = getBearerTokenFromRequest(req);
  if (!token) {
    return next(new AppError('You are not logged in. Please provide a valid Bearer token.', 401));
  }

  const decoded = verifyAccessToken(token);
  const UserModel = getUserModel();
  const user = await UserModel.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 403));
  }

  req.user = user;
  next();
});

/**
 * Role-based access control — restrict to specified roles
 * Usage: authorize('admin', 'stationOwner')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present, but doesn't require it
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  const token = getBearerTokenFromRequest(req);
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    const UserModel = getUserModel();
    const user = await UserModel.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Invalid or expired token — continue as anonymous
  }
  next();
});

// Backward compat alias
const authenticate = protect;

module.exports = { protect, authenticate, authorize, optionalAuth };
