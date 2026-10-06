'use strict';

require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'f1crazy',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  multipleStatements: false,
});

/**
 * Acquire a connection from the pool, ping it and release it.
 * Resolves to true when the database is reachable, false otherwise.
 */
async function checkDatabaseConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Database connection check failed:', err && err.message ? err.message : err);
    return false;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        // eslint-disable-next-line no-console
        console.error('[db] Failed to release connection:', releaseErr && releaseErr.message);
      }
    }
  }
}

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected pool error:', err && err.message ? err.message : err);
});

module.exports = { pool, checkDatabaseConnection };