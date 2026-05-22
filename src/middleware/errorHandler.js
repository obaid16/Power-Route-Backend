/**
 * errorHandler.js — Centralized Express Error Handling
 */
const AppError = require('../utils/AppError');

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
};

const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    err.statusCode = 400;
    err.message = `Validation failed: ${messages.join(', ')}`;
    err.status = 'fail';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    err.statusCode = 409;
    err.message = `Duplicate value for field: ${field}`;
    err.status = 'fail';
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = `Invalid ${err.path}: ${err.value}`;
    err.status = 'fail';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Invalid token. Please log in again.';
    err.status = 'fail';
  }
  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Your token has expired. Please log in again.';
    err.status = 'fail';
  }

  const response = {
    status: err.status,
    message: err.message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (err.details) response.details = err.details;
  }

  // Log server errors
  if (err.statusCode >= 500) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      component: 'errorHandler',
      message: err.message,
      stack: err.stack,
    }));
  }

  res.status(err.statusCode).json(response);
};

module.exports = { notFoundHandler, errorHandler };
