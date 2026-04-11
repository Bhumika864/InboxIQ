const rateLimit = require("express-rate-limit");

const standardRateLimitResponse = {
  message: "Too many requests. Please try again later.",
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardRateLimitResponse,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: standardRateLimitResponse,
});

const heavyOpsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many heavy operations. Please slow down and retry.",
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  heavyOpsLimiter,
};
