'use strict';

require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { checkDatabaseConnection } = require('./config/db');
const sessionMiddleware = require('./config/session');
const authRouter = require('./routes/auth');
const gameRouter = require('./routes/game');
const leaderboardRouter = require('./routes/leaderboard');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', false);
app.disable('x-powered-by');

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const ARX_PATTERN = /^https:\/\/([a-z0-9-]+\.)*arx-app\.com(:\d+)?$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin / curl / server-to-server
  if (ARX_PATTERN.test(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && LOCALHOST_PATTERN.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(sessionMiddleware);

// Simple request log (kept lightweight, no external deps)
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
    }
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'f1crazy-api', uptime: process.uptime() });
});

app.get('/api/health', async (req, res) => {
  let database = 'down';
  try {
    await checkDatabaseConnection();
    database = 'up';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[health] database check failed:', err.message);
  }
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'ok' : 'degraded',
    service: 'f1crazy-api',
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);
app.use('/api/leaderboard', leaderboardRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4119;
const HOST = '0.0.0.0';

function createServerInstance() {
  if (String(process.env.SSL_ENABLED).toLowerCase() === 'true') {
    try {
      const certPath = process.env.SSL_CERT_PATH;
      const keyPath = process.env.SSL_KEY_PATH;
      if (!certPath || !keyPath) {
        throw new Error('SSL_ENABLED is true but SSL_CERT_PATH / SSL_KEY_PATH are not set');
      }
      const options = {
        cert: fs.readFileSync(path.resolve(certPath)),
        key: fs.readFileSync(path.resolve(keyPath)),
      };
      if (process.env.SSL_CA_PATH && fs.existsSync(path.resolve(process.env.SSL_CA_PATH))) {
        options.ca = fs.readFileSync(path.resolve(process.env.SSL_CA_PATH));
      }
      // eslint-disable-next-line no-console
      console.log('[startup] TLS enabled — serving HTTPS directly');
      return { server: https.createServer(options, app), protocol: 'https' };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[startup] Failed to start HTTPS server, falling back to HTTP:', err.message);
    }
  }
  return { server: http.createServer(app), protocol: 'http' };
}

const { server, protocol } = createServerInstance();

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`F1 Crazy API listening on ${protocol}://${HOST}:${PORT}`);
  checkDatabaseConnection()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('[startup] MySQL connection OK');
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[startup] MySQL connection failed:', err.message);
    });
});

server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[server] fatal error:', err.message);
  process.exit(1);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[shutdown] received ${signal}, closing server...`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('[shutdown] server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException]', err);
});

module.exports = app;