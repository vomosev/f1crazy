'use strict';

const express = require('express');
const authController = require('../controllers/authController');
const { attachUser } = require('../middleware/auth');

const router = express.Router();

/**
 * Small inline guard helpers. The controllers perform the authoritative
 * validation, these simply reject obviously malformed bodies early so we
 * never hit the database with junk.
 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateSignupBody(req, res, next) {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const username = asString(req.body.username);
  const email = asString(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: 'Username, email and password are all required' });
  }

  if (username.length > 24 || email.length > 160 || password.length > 200) {
    return res.status(400).json({ error: 'One or more fields are too long' });
  }

  req.body.username = username;
  req.body.email = email;
  req.body.password = password;
  return next();
}

function validateLoginBody(req, res, next) {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  const identifier = asString(req.body.username || req.body.identifier || req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (identifier.length > 160 || password.length > 200) {
    return res.status(400).json({ error: 'One or more fields are too long' });
  }

  req.body.username = identifier;
  req.body.password = password;
  return next();
}

router.post('/signup', validateSignupBody, authController.signup);
router.post('/login', validateLoginBody, authController.login);
router.post('/logout', authController.logout);

// Guests are allowed here — the controller replies with { user: null }.
router.get('/me', attachUser, authController.me);

module.exports = router;