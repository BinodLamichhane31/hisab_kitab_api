const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many failed login attempts from this IP, please try again after 15 minutes.',
  handler: (req, res, next) => {
    res.status(429).json({ success: false, message: 'Too many login attempts. Please try again after 15 minutes.' });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginLimiter;

