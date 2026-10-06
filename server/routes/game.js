'use strict';

const express = require('express');
const router = express.Router();

const { requireAuth, attachUser } = require('../middleware/auth');
const gameController = require('../controllers/gameController');

/* Public catalogues ------------------------------------------------------- */

router.get('/characters', gameController.listCharacters);
router.get('/items', gameController.listItems);

/* Character selection ----------------------------------------------------- */

router.post('/character', requireAuth, attachUser, (req, res, next) => {
  const body = req.body || {};
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';

  if (!slug) {
    return res.status(400).json({ error: 'A character slug is required' });
  }
  if (!/^[a-z0-9-]{2,48}$/i.test(slug)) {
    return res.status(400).json({ error: 'Invalid character slug' });
  }

  req.body.slug = slug.toLowerCase();
  return gameController.selectCharacter(req, res, next);
});

/* Race submission --------------------------------------------------------- */

router.post('/races', requireAuth, attachUser, (req, res, next) => {
  const body = req.body || {};

  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid race payload' });
  }

  const characterSlug =
    typeof body.characterSlug === 'string' ? body.characterSlug.trim().toLowerCase() : '';

  if (!characterSlug || !/^[a-z0-9-]{2,48}$/.test(characterSlug)) {
    return res.status(400).json({ error: 'A valid characterSlug is required' });
  }

  const numeric = (value) => typeof value === 'number' && Number.isFinite(value);

  if (!numeric(body.score) || body.score < 0) {
    return res.status(400).json({ error: 'score must be a non-negative number' });
  }
  if (!numeric(body.laps) || body.laps < 1) {
    return res.status(400).json({ error: 'laps must be a positive number' });
  }
  if (body.bestLapMs != null && (!numeric(body.bestLapMs) || body.bestLapMs < 0)) {
    return res.status(400).json({ error: 'bestLapMs must be a non-negative number' });
  }
  if (body.totalTimeMs != null && (!numeric(body.totalTimeMs) || body.totalTimeMs < 0)) {
    return res.status(400).json({ error: 'totalTimeMs must be a non-negative number' });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 100) {
    return res.status(400).json({ error: 'Too many item entries submitted' });
  }

  for (const entry of items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return res.status(400).json({ error: 'Each item must be an object { slug, count }' });
    }
    const slug = typeof entry.slug === 'string' ? entry.slug.trim().toLowerCase() : '';
    if (!slug || !/^[a-z0-9-]{2,48}$/.test(slug)) {
      return res.status(400).json({ error: 'Each item requires a valid slug' });
    }
    if (entry.count != null && (!numeric(entry.count) || entry.count < 0)) {
      return res.status(400).json({ error: 'Item count must be a non-negative number' });
    }
  }

  req.body.characterSlug = characterSlug;
  req.body.items = items.map((entry) => ({
    slug: String(entry.slug).trim().toLowerCase(),
    count: numeric(entry.count) ? Math.floor(entry.count) : 1,
  }));

  return gameController.submitRace(req, res, next);
});

/* Player data ------------------------------------------------------------- */

router.get('/me/races', requireAuth, attachUser, gameController.listMyRaces);
router.get('/me/stats', requireAuth, attachUser, gameController.getMyStats);
router.get('/me/inventory', requireAuth, attachUser, gameController.getMyInventory);

module.exports = router;