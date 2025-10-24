const express = require('express');
const router = express.Router();
const vertexAIService = require('../services/vertexAIService');

// Analyze credibility of content
router.post('/credibility', async (req, res) => {
  try {
    const { content, sources = [] } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const analysis = await vertexAIService.analyzeCredibility(content, sources);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Credibility analysis failed', details: error.message });
  }
});

// Detect bias in text
router.post('/bias', async (req, res) => {
  try {
    const { text, source } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const biasAnalysis = await vertexAIService.detectBias(text, source);
    res.json(biasAnalysis);
  } catch (error) {
    res.status(500).json({ error: 'Bias analysis failed', details: error.message });
  }
});

module.exports = router;