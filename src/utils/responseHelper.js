/**
 * responseHelper — Centralized JSON response format
 */

const sendSuccess = (res, statusCode, message, data = null) => {
  const response = { status: 'success', message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode, message, details = null) => {
  const response = { status: 'fail', message };
  if (details !== null) response.details = details;
  return res.status(statusCode).json(response);
};

const sendPaginated = (res, statusCode, message, data, pagination) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    pagination,
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
