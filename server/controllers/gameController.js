'use strict';

const { pool } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const MAX_SCORE = 100000;
const MAX_LAPS = 10;
const MAX_ITEM_COUNT = 500;

function toInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function mapCharacterRow(row) {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    topSpeed: Number(row.top_speed),
    handling: Number(row.handling),
    luck: Number(row.luck),
    accentColor: row.accent_color,
    unlockPoints: Number(row.unlock_points),
    isStarter: Boolean(row.is_starter),
  };
}

function mapItemRow(row) {
  return {
    slug: row.slug,
    name: row.name,
    svgKey: row.svg_key,
    points: Number(row.points_value),
    rarity: row.rarity,
    description: row.description,
    isHazard: Number(row.points_value) < 0,
  };
}

/* GET /api/game/characters */
async function listCharacters(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, slug, name, tagline, description, top_speed, handling, luck, accent_color, unlock_points, is_starter FROM characters ORDER BY unlock_points ASC, id ASC'
    );
    res.json({ characters: rows.map(mapCharacterRow) });
  } catch (err) {
    next(err);
  }
}

/* GET /api/game/items */
async function listItems(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, slug, name, svg_key, points_value, rarity, description FROM items ORDER BY points_value DESC, id ASC'
    );
    res.json({ items: rows.map(mapItemRow) });
  } catch (err) {
    next(err);
  }
}

/* POST /api/game/character  body {slug} */
async function selectCharacter(req, res, next) {
  try {
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim().toLowerCase() : '';
    if (!slug || slug.length > 64) {
      throw new AppError('A valid character slug is required', 400);
    }

    const [charRows] = await pool.execute(
      'SELECT slug, unlock_points FROM characters WHERE slug = ? LIMIT 1',
      [slug]
    );
    if (charRows.length === 0) {
      throw new AppError('Character not found', 404);
    }

    const [userRows] = await pool.execute(
      'SELECT id, total_points FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );
    if (userRows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const unlockPoints = Number(charRows[0].unlock_points) || 0;
    const totalPoints = Number(userRows[0].total_points) || 0;
    if (unlockPoints > totalPoints) {
      throw new AppError(
        `This driver unlocks at ${unlockPoints} points. You have ${totalPoints}.`,
        403
      );
    }

    await pool.execute('UPDATE users SET selected_character_slug = ? WHERE id = ?', [
      slug,
      req.session.userId,
    ]);

    res.json({ selectedCharacterSlug: slug });
  } catch (err) {
    next(err);
  }
}

/* POST /api/game/races */
async function submitRace(req, res, next) {
  let connection;
  try {
    const body = req.body || {};
    const userId = req.session.userId;

    const characterSlugRaw =
      typeof body.characterSlug === 'string' ? body.characterSlug.trim().toLowerCase() : '';
    if (!characterSlugRaw) {
      throw new AppError('characterSlug is required', 400);
    }

    const [charRows] = await pool.execute(
      'SELECT slug FROM characters WHERE slug = ? LIMIT 1',
      [characterSlugRaw]
    );
    if (charRows.length === 0) {
      throw new AppError('Unknown character', 400);
    }
    const characterSlug = charRows[0].slug;

    const laps = clamp(toInt(body.laps, 1), 1, MAX_LAPS);
    const bestLapMs = clamp(toInt(body.bestLapMs, 0), 0, 60 * 60 * 1000);
    const totalTimeMs = clamp(toInt(body.totalTimeMs, 0), 0, 24 * 60 * 60 * 1000);
    const clientScore = clamp(toInt(body.score, 0), 0, MAX_SCORE);

    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    const requested = new Map();
    for (const entry of rawItems) {
      if (!entry || typeof entry.slug !== 'string') continue;
      const slug = entry.slug.trim().toLowerCase();
      if (!slug || slug.length > 64) continue;
      const count = clamp(toInt(entry.count, 0), 0, MAX_ITEM_COUNT);
      if (count <= 0) continue;
      requested.set(slug, Math.min(MAX_ITEM_COUNT, (requested.get(slug) || 0) + count));
    }

    let validated = [];
    let computedScore = 0;

    if (requested.size > 0) {
      const slugs = Array.from(requested.keys());
      const placeholders = slugs.map(() => '?').join(', ');
      const [itemRows] = await pool.execute(
        `SELECT slug, name, points_value FROM items WHERE slug IN (${placeholders})`,
        slugs
      );
      validated = itemRows.map((row) => {
        const count = requested.get(row.slug) || 0;
        const points = Number(row.points_value) * count;
        computedScore += points;
        return { slug: row.slug, name: row.name, count, points };
      });
    }

    // Authoritative score: derived from item values, but never below zero and
    // never above the hard cap. If no items were sent, fall back to the clamped
    // client score so a clean race still records something sensible.
    let score = validated.length > 0 ? computedScore : clientScore;
    score = clamp(Math.round(score), 0, MAX_SCORE);

    const itemsCollected = validated.reduce((sum, item) => sum + item.count, 0);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [insertResult] = await connection.execute(
      `INSERT INTO races
        (user_id, character_slug, score, items_collected, best_lap_ms, total_time_ms, laps, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, characterSlug, score, itemsCollected, bestLapMs, totalTimeMs, laps]
    );

    for (const item of validated) {
      await connection.execute(
        `INSERT INTO inventories (user_id, item_slug, quantity)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
        [userId, item.slug, item.count]
      );
    }

    await connection.execute(
      'UPDATE users SET total_points = total_points + ?, races_played = races_played + 1 WHERE id = ?',
      [score, userId]
    );

    await connection.commit();
    connection.release();
    connection = null;

    const [[rankRow]] = await pool.execute(
      `SELECT COUNT(*) + 1 AS position FROM (
         SELECT user_id, MAX(score) AS best_score FROM races GROUP BY user_id
       ) AS totals
       WHERE totals.best_score > ?`,
      [score]
    );

    const [[totalsRow]] = await pool.execute(
      'SELECT total_points, races_played FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    res.status(201).json({
      race: {
        id: insertResult.insertId,
        characterSlug,
        score,
        laps,
        bestLapMs,
        totalTimeMs,
        itemsCollected,
        items: validated,
      },
      rank: Number(rankRow?.position) || 1,
      totals: {
        totalPoints: Number(totalsRow?.total_points) || 0,
        racesPlayed: Number(totalsRow?.races_played) || 0,
      },
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('[gameController] rollback failed:', rollbackErr.message);
      }
      connection.release();
    }
    next(err);
  }
}

/* GET /api/game/me/races */
async function listMyRaces(req, res, next) {
  try {
    const limit = clamp(toInt(req.query.limit, 10), 1, 50);
    const [rows] = await pool.execute(
      `SELECT id, character_slug, score, items_collected, best_lap_ms, total_time_ms, laps, created_at
       FROM races
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit}`,
      [req.session.userId]
    );

    res.json({
      races: rows.map((row) => ({
        id: row.id,
        characterSlug: row.character_slug,
        score: Number(row.score),
        itemsCollected: Number(row.items_collected),
        bestLapMs: Number(row.best_lap_ms),
        totalTimeMs: Number(row.total_time_ms),
        laps: Number(row.laps),
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/* GET /api/game/me/stats */
async function getMyStats(req, res, next) {
  try {
    const userId = req.session.userId;

    const [[userRow]] = await pool.execute(
      'SELECT id, username, email, selected_character_slug, total_points, races_played, created_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!userRow) {
      throw new AppError('User not found', 404);
    }

    const [[agg]] = await pool.execute(
      `SELECT
         COUNT(*) AS races,
         COALESCE(MAX(score), 0) AS best_score,
         COALESCE(SUM(items_collected), 0) AS items_collected,
         COALESCE(SUM(laps), 0) AS laps,
         MIN(NULLIF(best_lap_ms, 0)) AS best_lap_ms
       FROM races WHERE user_id = ?`,
      [userId]
    );

    const bestScore = Number(agg?.best_score) || 0;

    const [[rankRow]] = await pool.execute(
      `SELECT COUNT(*) + 1 AS position FROM (
         SELECT user_id, MAX(score) AS best_score FROM races GROUP BY user_id
       ) AS totals
       WHERE totals.best_score > ?`,
      [bestScore]
    );

    res.json({
      stats: {
        username: userRow.username,
        selectedCharacterSlug: userRow.selected_character_slug,
        totalPoints: Number(userRow.total_points) || 0,
        racesPlayed: Number(userRow.races_played) || 0,
        racesRecorded: Number(agg?.races) || 0,
        bestScore,
        bestLapMs: agg?.best_lap_ms == null ? null : Number(agg.best_lap_ms),
        itemsCollected: Number(agg?.items_collected) || 0,
        lapsDriven: Number(agg?.laps) || 0,
        rank: Number(rankRow?.position) || 1,
        memberSince: userRow.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/* GET /api/game/me/inventory */
async function getMyInventory(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT inv.item_slug, inv.quantity, i.name, i.points_value, i.rarity, i.description
       FROM inventories inv
       LEFT JOIN items i ON i.slug = inv.item_slug
       WHERE inv.user_id = ?
       ORDER BY inv.quantity DESC, inv.item_slug ASC`,
      [req.session.userId]
    );

    res.json({
      inventory: rows.map((row) => ({
        slug: row.item_slug,
        name: row.name || row.item_slug,
        quantity: Number(row.quantity) || 0,
        points: row.points_value == null ? 0 : Number(row.points_value),
        rarity: row.rarity || 'common',
        description: row.description || '',
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCharacters,
  listItems,
  selectCharacter,
  submitRace,
  listMyRaces,
  getMyStats,
  getMyInventory,
};