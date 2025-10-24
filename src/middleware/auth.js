const logger = require('../utils/logger');

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // Check if API key is required
  const requireApiKey = process.env.REQUIRE_API_KEY === 'true';
  
  if (!requireApiKey) {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Validate API key (in production, check against database or service)
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',').filter(Boolean);
  
  if (validApiKeys.length > 0 && !validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key attempt:', { apiKey, ip: req.ip });
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

module.exports = { validateApiKey };