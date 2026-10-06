const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

/**
 * GET /api/leaderboard
 * Query params:
 *   range = 'all' | 'week' (default 'all')
 *   limit = 1..100 (default 20)
 */
router.get(
  '/',
  (req, res, next) => {
    const rawRange = typeof req.query.range === 'string' ? req.query.range.toLowerCase() : 'all';
    req.query.range = rawRange === 'week' ? 'week' : 'all';

    const rawLimit = req.query.limit;
    let limit = 20;
    if (rawLimit !== undefined && rawLimit !== null && String(rawLimit).trim() !== '') {
      const parsed = Number.parseInt(String(rawLimit), 10);
      if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
        return res.status(400).json({ error: 'limit must be a number between 1 and 100' });
      }
      limit = Math.min(100, Math.max(1, parsed));
    }
    req.query.limit = String(limit);

    return next();
  },
  getLeaderboard
);

module.exports = router;