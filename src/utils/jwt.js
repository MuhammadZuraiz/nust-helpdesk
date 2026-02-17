const jwt = require('jsonwebtoken');
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '30d';
const JWT_SECRET = process.env.JWT_SECRET;

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}
function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verify,
};