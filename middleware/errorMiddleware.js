const AppError = require('../utils/AppError');

function notFoundHandler(req, res, next) {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
}

function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      details: err.details,
      stack: err.stack,
    });
  }

  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    return res.status(400).json({ status: 'fail', message });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      status: 'fail',
      message: `Duplicate value for ${field}. Please use another value.`,
    });
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({ status: 'fail', message: messages.join('. ') || err.message });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'fail', message: 'Invalid token. Please log in again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'fail', message: 'Your token has expired. Please log in again.' });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // eslint-disable-next-line no-console
  console.error('ERROR:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
}

module.exports = { notFoundHandler, errorHandler };
