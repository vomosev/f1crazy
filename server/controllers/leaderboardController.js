'use strict';

const { pool } = require('../config/db');

/**
 * GET /api/leaderboard?range=all|week&limit=1..100
 * Returns { range, limit, rows: [{ rank, username, characterSlug, score, bestLapMs, races }] }
 * Never errors when there are no races — returns an empty array instead.
 */
async function getLeaderboard(req, res, next) {
  try {
    const rawRange = typeof req.query.range === 'string' ? req.query.range.toLowerCase() : 'all';
    const range = rawRange === 'week' ? 'week' : 'all';

    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const whereClauses = ['r.user_id IS NOT NULL'];
    if (range === 'week') {
      whereClauses.push('r.created_at >= (NOW() - INTERVAL 7 DAY)');
    }
    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // limit is an integer validated above, safe to inline for LIMIT.
    const sql = `
      SELECT
        u.username AS username,
        SUBSTRING_INDEX(
          GROUP_CONCAT(r.character_slug ORDER BY r.score DESC, r.id DESC SEPARATOR 0x1f),
          CHAR(31), 1
        ) AS character_slug,
        MAX(r.score) AS best_score,
        MIN(NULLIF(r.best_lap_ms, 0)) AS best_lap,
        COUNT(*) AS races
      FROM races r
      INNER JOIN users u ON u.id = r.user_id
      ${whereSql}
      GROUP BY r.user_id, u.username
      ORDER BY best_score DESC, (best_lap IS NULL) ASC, best_lap ASC, races DESC
      LIMIT ${limit}
    `;

    let records = [];
    try {
      const [dbRows] = await pool.query(sql);
      records = Array.isArray(dbRows) ? dbRows : [];
    } catch (dbErr) {
      // Missing tables / empty database should not break the public leaderboard.
      if (dbErr && (dbErr.code === 'ER_NO_SUCH_TABLE' || dbErr.code === 'ER_BAD_FIELD_ERROR')) {
        records = [];
      } else {
        throw dbErr;
      }
    }

    const rows = records.map((row, index) => ({
      rank: index + 1,
      username: row.username || 'Unknown driver',
      characterSlug: row.character_slug || null,
      score: Number(row.best_score) || 0,
      bestLapMs: row.best_lap === null || row.best_lap === undefined ? null : Number(row.best_lap),
      races: Number(row.races) || 0,
    }));

    return res.json({ range, limit, rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getLeaderboard };