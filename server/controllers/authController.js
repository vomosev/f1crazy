'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_CHARACTER_SLUG = 'banana-baron';
const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSION_COOKIE_NAME = 'f1crazy.sid';

function sanitiseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    selectedCharacterSlug: row.selected_character_slug || DEFAULT_CHARACTER_SLUG,
    totalPoints: Number(row.total_points) || 0,
    racesPlayed: Number(row.races_played) || 0,
    createdAt: row.created_at || null,
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') {
      resolve();
      return;
    }
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') {
      resolve();
      return;
    }
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function resolveStarterSlug() {
  try {
    const [rows] = await pool.execute(
      'SELECT slug FROM characters WHERE is_starter = 1 ORDER BY id ASC LIMIT 1'
    );
    if (rows && rows.length > 0 && rows[0].slug) {
      return rows[0].slug;
    }
  } catch (err) {
    // Fall through to the static default when the table is unavailable.
  }
  return DEFAULT_CHARACTER_SLUG;
}

async function signup(req, res, next) {
  try {
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!USERNAME_RE.test(username)) {
      throw new AppError(
        'Username must be 3-24 characters using letters, numbers or underscores.',
        400
      );
    }
    if (!EMAIL_RE.test(email) || email.length > 120) {
      throw new AppError('Please provide a valid email address.', 400);
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      throw new AppError('Password must be at least 8 characters long.', 400);
    }

    const [existing] = await pool.execute(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (existing && existing.length > 0) {
      const clash = existing[0];
      const field =
        String(clash.username).toLowerCase() === username.toLowerCase() ? 'Username' : 'Email';
      throw new AppError(`${field} is already taken.`, 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const starterSlug = await resolveStarterSlug();

    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, selected_character_slug, total_points, races_played)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [username, email, passwordHash, starterSlug]
    );

    const userId = result.insertId;
    const [rows] = await pool.execute(
      `SELECT id, username, email, selected_character_slug, total_points, races_played, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = sanitiseUser(rows && rows[0]);

    await regenerateSession(req);
    if (req.session) {
      req.session.userId = userId;
    }
    await saveSession(req);

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const body = req.body || {};
    const identifier =
      typeof body.username === 'string' && body.username.trim()
        ? body.username.trim()
        : typeof body.email === 'string'
        ? body.email.trim()
        : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!identifier || !password) {
      throw new AppError('Username and password are required.', 400);
    }

    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, selected_character_slug, total_points, races_played, created_at
       FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [identifier, identifier.toLowerCase()]
    );

    const row = rows && rows[0];
    if (!row) {
      throw new AppError('Invalid credentials.', 401);
    }

    const matches = await bcrypt.compare(password, row.password_hash || '');
    if (!matches) {
      throw new AppError('Invalid credentials.', 401);
    }

    await regenerateSession(req);
    if (req.session) {
      req.session.userId = row.id;
    }
    await saveSession(req);

    res.json({ user: sanitiseUser(row) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (!req.session || typeof req.session.destroy !== 'function') {
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      res.json({ ok: true });
      return;
    }

    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      res.json({ user: null });
      return;
    }

    const [rows] = await pool.execute(
      `SELECT id, username, email, selected_character_slug, total_points, races_played, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    const row = rows && rows[0];
    if (!row) {
      res.json({ user: null });
      return;
    }

    res.json({ user: sanitiseUser(row) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  logout,
  me,
  sanitiseUser,
  DEFAULT_CHARACTER_SLUG,
};