const express = require('express');
const router = express.Router();
const elasticService = require('../services/elasticService');
const vertexAIService = require('../services/vertexAIService');

// Direct search endpoint
router.post('/query', async (req, res) => {
  try {
    const { query, filters = {}, size = 20 } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Generate embedding for semantic search
    const embedding = await vertexAIService.generateEmbedding(query);
    
    const searchResults = await elasticService.hybridSearch(query, {
      ...filters,
      embedding,
      size
    });

    res.json(searchResults);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get search statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await elasticService.getSourceStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stats', details: error.message });
  }
});

module.exports = router;