const jwt = require('jsonwebtoken');
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '30d';

// Two separate secrets so access and refresh tokens can be rotated independently.
// JWT_SECRET is kept as a fallback for ACCESS_SECRET to avoid breaking existing setups.
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secret(s) not configured. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your .env');
}

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// Kept for backward-compat with auth.middleware.js — verifies access tokens
function verify(token) {
  return verifyAccessToken(token);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  verify,
};
