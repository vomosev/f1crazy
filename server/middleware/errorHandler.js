'use strict';

/**
 * AppError — small typed error used by controllers to signal an HTTP status.
 *
 * Usage: throw new AppError(400, 'Invalid payload');
 */
class AppError extends Error {
  constructor(status = 500, message = 'Internal server error', details) {
    super(message);
    this.name = 'AppError';
    this.status = Number(status) || 500;
    if (details !== undefined) {
      this.details = details;
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * 404 handler — mounted after all routers.
 */
function notFound(req, res, next) {
  res.status(404).json({ error: 'Route not found' });
}

/**
 * Map a raw error object onto a safe { status, message } pair.
 */
function mapError(err) {
  if (!err) {
    return { status: 500, message: 'Internal server error' };
  }

  // Explicit application errors
  if (err instanceof AppError || err.name === 'AppError') {
    return {
      status: err.status || 500,
      message: err.message || 'Internal server error',
      details: err.details,
    };
  }

  // Errors that already carry an HTTP status (e.g. express.json body parser)
  const explicitStatus = err.status || err.statusCode;
  if (explicitStatus && explicitStatus >= 400 && explicitStatus < 600) {
    if (err.type === 'entity.parse.failed') {
      return { status: 400, message: 'Invalid JSON body' };
    }
    if (err.type === 'entity.too.large') {
      return { status: 413, message: 'Request body too large' };
    }
    return {
      status: explicitStatus,
      message: explicitStatus < 500 ? err.message || 'Request failed' : 'Internal server error',
    };
  }

  // MySQL specific error codes
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return { status: 409, message: 'That record already exists' };
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return { status: 400, message: 'Referenced record does not exist' };
    case 'ER_DATA_TOO_LONG':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
      return { status: 400, message: 'One or more values are out of range' };
    case 'ER_BAD_FIELD_ERROR':
    case 'ER_NO_SUCH_TABLE':
      return { status: 500, message: 'Internal server error' };
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ETIMEDOUT':
      return { status: 503, message: 'Database unavailable, please try again shortly' };
    default:
      break;
  }

  // CORS rejection raised by the origin callback in server/index.js
  if (typeof err.message === 'string' && err.message.toLowerCase().includes('not allowed by cors')) {
    return { status: 403, message: 'Origin not allowed' };
  }

  if (err.name === 'AbortError') {
    return { status: 504, message: 'Upstream request timed out' };
  }

  return { status: 500, message: 'Internal server error' };
}

/**
 * Central Express error handler. Must keep the 4-arg signature.
 */
function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const { status, message, details } = mapError(err);

  const label = `[f1crazy] ${req && req.method ? req.method : '?'} ${
    req && req.originalUrl ? req.originalUrl : '?'
  } -> ${status}`;

  if (status >= 500) {
    console.error(label, err && err.stack ? err.stack : err);
  } else {
    console.warn(label, err && err.message ? err.message : err);
  }

  if (res.headersSent) {
    return next(err);
  }

  const payload = { error: message };

  if (details !== undefined) {
    payload.details = details;
  }

  if (!isProduction && err && err.stack && status >= 500) {
    payload.stack = String(err.stack).split('\n').slice(0, 8);
  }

  res.status(status).json(payload);
}

module.exports = { AppError, notFound, errorHandler };