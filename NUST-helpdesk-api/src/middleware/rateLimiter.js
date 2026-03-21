const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 5,                    // max requests per IP within the window
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,     // sends rate limit info in response headers
  legacyHeaders: false,      // disables older header format
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };