const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES_IN  = '15m';
const REFRESH_EXPIRES_IN = '30d';

function getSecrets() {
  const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error('JWT secret(s) not configured. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your environment variables');
  }

  return { ACCESS_SECRET, REFRESH_SECRET };
}

function signAccessToken(payload) {
  const { ACCESS_SECRET } = getSecrets();
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function signRefreshToken(payload) {
  const { REFRESH_SECRET } = getSecrets();
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function verifyAccessToken(token) {
  const { ACCESS_SECRET } = getSecrets();
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  const { REFRESH_SECRET } = getSecrets();
  return jwt.verify(token, REFRESH_SECRET);
}

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