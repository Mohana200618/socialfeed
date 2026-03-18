// Simple in-memory rate limiter
// For production, consider using express-rate-limit or redis

const requestCounts = new Map();

export const rateLimiter = (options = {}) => {
  const { 
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100 // limit each IP to 100 requests per windowMs
  } = options;

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = requestCounts.get(key);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    if (record.count >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
    }

    record.count++;
    next();
  };
};
