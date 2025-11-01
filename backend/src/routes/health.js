const express = require('express');
const router = express.Router();
const elasticService = require('../services/elasticService');
const vertexAIService = require('../services/vertexAIService');
const cacheService = require('../services/cacheService');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        elasticsearch: 'unknown',
        vertexAI: 'unknown',
        redis: 'unknown'
      }
    };

    // Check Elasticsearch
    try {
      const elasticHealth = await elasticService.client.cluster.health();
      status.services.elasticsearch = elasticHealth.status === 'green' ? 'healthy' : 'degraded';
    } catch (error) {
      status.services.elasticsearch = 'unhealthy';
    }

    // Check Vertex AI
    try {
      await vertexAIService.generateText('Say "OK"', { maxTokens: 50 });
      status.services.vertexAI = 'healthy';
    } catch (error) {
      status.services.vertexAI = 'unhealthy';
    }

    // Check Redis
    try {
      const cacheStats = await cacheService.getCacheStats();
      status.services.redis = cacheStats.connected ? 'healthy' : 'unhealthy';
    } catch (error) {
      status.services.redis = 'unhealthy';
    }

    const allHealthy = Object.values(status.services).every(service => service === 'healthy');
    status.status = allHealthy ? 'healthy' : 'degraded';

    res.status(allHealthy ? 200 : 503).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Cache statistics endpoint
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    res.json({
      timestamp: new Date().toISOString(),
      cache: stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cache stats',
      message: error.message
    });
  }
});

module.exports = router;