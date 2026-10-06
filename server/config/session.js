'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./db');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const storeOptions = {
  createDatabaseTable: false,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: SEVEN_DAYS_MS,
  clearExpired: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

let store;

try {
  // Reuse the shared mysql2 pool so we do not open a second connection pool.
  store = new MySQLStore(storeOptions, pool);

  if (store && typeof store.on === 'function') {
    store.on('error', (err) => {
      console.error('[session] MySQL session store error:', err && err.message ? err.message : err);
    });
  }
} catch (err) {
  console.error(
    '[session] Failed to initialise the MySQL session store, falling back to in-memory sessions:',
    err && err.message ? err.message : err
  );
  store = undefined;
}

const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.SESSION_SECRET || 'f1crazy-development-session-secret';

if (!process.env.SESSION_SECRET) {
  console.warn('[session] SESSION_SECRET is not set — using an insecure development fallback.');
}

const sessionMiddleware = session({
  name: 'f1crazy.sid',
  secret,
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: SEVEN_DAYS_MS,
    path: '/'
  }
});

/**
 * Wrap the session middleware so a transient store failure never takes the
 * whole API down — the request simply continues without a persisted session.
 */
function safeSessionMiddleware(req, res, next) {
  sessionMiddleware(req, res, (err) => {
    if (err) {
      console.error('[session] Session middleware error:', err && err.message ? err.message : err);
      if (!req.session) {
        req.session = {
          destroy: (cb) => (typeof cb === 'function' ? cb(null) : undefined),
          regenerate: (cb) => (typeof cb === 'function' ? cb(null) : undefined),
          save: (cb) => (typeof cb === 'function' ? cb(null) : undefined)
        };
      }
    }
    next();
  });
}

module.exports = safeSessionMiddleware;
module.exports.sessionMiddleware = safeSessionMiddleware;
module.exports.store = store;
module.exports.isProduction = isProduction;