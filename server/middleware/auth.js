'use strict';

const { pool } = require('../config/db');

/**
 * Blocks the request when there is no authenticated session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return next();
}

/**
 * Loads the current user onto req.user when a session exists.
 * Never fails the request: guests simply get req.user === null.
 */
async function attachUser(req, res, next) {
  req.user = null;

  const userId = req.session && req.session.userId ? req.session.userId : null;
  if (!userId) {
    return next();
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, selected_character_slug, total_points, races_played
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [userId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      req.user = {
        id: row.id,
        username: row.username,
        email: row.email,
        selectedCharacterSlug: row.selected_character_slug,
        totalPoints: Number(row.total_points) || 0,
        racesPlayed: Number(row.races_played) || 0,
      };
    } else {
      // Session points at a user that no longer exists: clear it quietly.
      if (req.session) {
        req.session.userId = null;
      }
    }
  } catch (err) {
    // Database hiccups must not break public routes.
    console.error('[auth] attachUser failed:', err && err.message ? err.message : err);
    req.user = null;
  }

  return next();
}

module.exports = { requireAuth, attachUser };