const elasticService = require('../services/elasticService');
const vertexAIService = require('../services/vertexAIService');
const LiveSearchService = require('../services/liveSearchService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ConversationController {
  constructor() {
    this.conversations = new Map(); // In production, use Redis or database
    this.liveSearchService = new LiveSearchService();
  }

  async startConversation(req, res) {
    try {
      const conversationId = uuidv4();
      const userId = req.headers['x-user-id'] || 'anonymous';
      
      const conversation = {
        id: conversationId,
        userId,
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      this.conversations.set(conversationId, conversation);

      res.json({
        conversationId,
        message: "Hello! I'm Reality Check, your AI-powered information navigator. Ask me about any claim, news story, or information you'd like me to verify and analyze.",
        suggestions: [
          "I saw a post about electric cars being worse for the environment. Is this true?",
          "Help me understand the different perspectives on this economic policy",
          "Can you fact-check this article I found on social media?"
        ]
      });
    } catch (error) {
      logger.error('Start conversation error:', error);
      res.status(500).json({ error: 'Failed to start conversation' });
    }
  }

  async askQuestion(req, res) {
    try {
      const { conversationId, question } = req.body;
      
      if (!question || question.trim().length === 0) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Process the question
      const response = await this.processQuestion(question, conversation);
      
      // Update conversation
      conversation.messages.push(
        { role: 'user', content: question, timestamp: new Date() },
        { role: 'assistant', content: response.message, timestamp: new Date(), metadata: response.metadata }
      );
      conversation.lastUpdated = new Date();

      res.json(response);
    } catch (error) {
      logger.error('Ask question error:', error);
      res.status(500).json({ error: 'Failed to process question' });
    }
  }

  async handleSocketQuestion(socket, data) {
    try {
      logger.info('🚀 Starting handleSocketQuestion');
      const { question, conversationId } = data;
      
      logger.info(`Question: "${question}", ConversationID: ${conversationId}`);
      
      // Get conversation
      let conversation = this.conversations.get(conversationId);
      if (!conversation) {
        logger.info('Creating new conversation');
        conversation = {
          id: conversationId,
          userId: data.userId || 'anonymous',
          messages: [],
          createdAt: new Date(),
          lastUpdated: new Date()
        };
        this.conversations.set(conversationId, conversation);
      } else {
        logger.info(`Found existing conversation with ${conversation.messages.length} messages`);
      }

      // Step 1: Understand intent
      logger.info('📊 Step 1: Understanding intent');
      socket.emit('search-progress', { 
        stage: 'understanding', 
        message: 'Understanding your question and determining search strategy...' 
      });

      // Generate embeddings for semantic search
      let embedding;
      try {
        embedding = await vertexAIService.generateEmbedding(question);
      } catch (embeddingError) {
        logger.error('Embedding generation failed, proceeding with text-only search:', embeddingError);
        // Continue without embeddings - use text search only
        embedding = null;
      }

      // Step 2: Search for information
      // First, check if we have cached results for this exact question
      logger.info('🔍 Checking cache for previous search results...');
      const cachedSearch = await cacheService.getCachedSearch(question);
      
      let searchResults;
      let liveResults;
      let elasticResults = { results: [], total: 0 };
      
      if (cachedSearch && cachedSearch.results) {
        // Use cached search results
        logger.info(`✅ Using cached search results (${cachedSearch.results.length} sources, ${Math.round(cachedSearch._cacheAge / 1000)}s old)`);
        searchResults = {
          results: cachedSearch.results,
          total: cachedSearch.total,
          sources: cachedSearch.sources,
          _fromCache: true,
          _cacheAge: cachedSearch._cacheAge
        };
        
        socket.emit('search-progress', { 
          stage: 'searching', 
          message: `Found ${searchResults.total} cached results from previous search...` 
        });
      } else {
        // No cache - do live search
        socket.emit('search-progress', { 
          stage: 'searching', 
          message: 'Searching news, fact-checkers, and web sources in real-time...' 
        });

        logger.info('🔍 Starting live search across multiple sources');
        
        // Use live search APIs (NewsAPI, Google Search, Fact-checkers)
        liveResults = await this.liveSearchService.comprehensiveSearch(question, {
          size: 25
        });

        logger.info(`📊 Live search found ${liveResults.total} results from ${Object.keys(liveResults.sources).length} source types`);

        // Also try Elasticsearch for any indexed content (optional fallback)
        try {
          if (embedding) {
            elasticResults = await elasticService.hybridSearch(question, {
              embedding: embedding,
              types: ['news', 'studies', 'factChecks', 'government'],
              size: 10
            });
            logger.info(`📚 Elasticsearch found ${elasticResults.total} additional indexed results`);
          }
        } catch (elasticError) {
          logger.warn('Elasticsearch search failed, using only live results:', elasticError.message);
        }

        // Combine and deduplicate results
        const allResults = [...liveResults.results, ...elasticResults.results];
        const uniqueResults = this.deduplicateResults(allResults);
        const sortedResults = uniqueResults.sort((a, b) => b.credibilityScore - a.credibilityScore);
        
        searchResults = {
          results: sortedResults.slice(0, 25),
          total: liveResults.total + elasticResults.total,
          sources: liveResults.sources,
          _fromCache: false
        };

        // Cache the search results for 1 hour
        logger.info('💾 Caching search results for future queries...');
        await cacheService.cacheSearchResults(question, searchResults, 3600);
      }

      logger.info(`✨ Using ${searchResults.results.length} unique sources (${searchResults._fromCache ? 'CACHED' : 'FRESH'})`);

      socket.emit('search-progress', { 
        stage: 'analyzing', 
        message: `Found ${searchResults.total} relevant sources. Analyzing credibility...` 
      });

      // Step 3: Analyze credibility
      let credibilityAnalysis;
      try {
        credibilityAnalysis = await vertexAIService.analyzeCredibility(
          question, 
          searchResults.results.slice(0, 10).map(r => r.source)
        );
      } catch (analysisError) {
        logger.error('Credibility analysis failed, using fallback:', analysisError);
        credibilityAnalysis = {
          credibility_score: 0.5,
          confidence_level: "low",
          key_findings: ["AI analysis temporarily unavailable"],
          source_reliability: { high: [], medium: [], low: [] },
          consensus: "mixed",
          red_flags: [],
          verification_needed: [],
          summary: "Manual review recommended - AI analysis unavailable"
        };
      }

      // Step 4: Generate response
      socket.emit('search-progress', { 
        stage: 'generating', 
        message: 'Generating balanced analysis and response...' 
      });

      let conversationalResponse;
      try {
        conversationalResponse = await vertexAIService.generateConversationalResponse(
          question, 
          searchResults.results.slice(0, 15),
          { history: conversation.messages.slice(-6) }
        );
      } catch (responseError) {
        logger.error('Response generation failed, using fallback:', responseError);
        // Create a basic response from search results
        const topSources = searchResults.results.slice(0, 5);
        conversationalResponse = `I found ${searchResults.total} sources related to your question "${question}". Here are the top findings:

${topSources.map((result, index) => {
  const title = result.source?.title || 'Unknown Source';
  const source = result.source?.source || 'N/A';
  const content = result.source?.content || result.source?.snippet || result.source?.description || 'No content available';
  const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
  return `${index + 1}. ${title} (${source})\n   ${preview}`;
}).join('\n\n')}

Please note: AI analysis is temporarily limited. I recommend reviewing these sources directly for a complete understanding.`;
      }

      // Step 5: Generate follow-up questions
      let followUpQuestions;
      try {
        followUpQuestions = await vertexAIService.generateFollowUpQuestions([
          ...conversation.messages.slice(-4),
          { role: 'user', content: question },
          { role: 'assistant', content: conversationalResponse }
        ]);
      } catch (followUpError) {
        logger.error('Follow-up generation failed, using defaults:', followUpError);
        followUpQuestions = [
          "Can you tell me more about the sources for this information?",
          "What are the main counterarguments to this claim?",
          "How reliable are the sources that discuss this topic?"
        ];
      }

      const response = {
        message: conversationalResponse,
        metadata: {
          searchStats: {
            totalSources: searchResults.total,
            sourcesAnalyzed: Math.min(25, searchResults.results.length),
            credibilityScore: credibilityAnalysis.credibility_score,
            confidenceLevel: credibilityAnalysis.confidence_level
          },
          sources: searchResults.results.slice(0, 25).map(result => ({
            title: result.source.title,
            source: result.source.source,
            url: result.source.url,
            credibilityScore: result.source.credibilityScore,
            relevanceScore: result.score,
            publishDate: result.source.publishDate
          })),
          analysis: credibilityAnalysis,
          followUpQuestions
        }
      };

      // Update conversation
      conversation.messages.push(
        { role: 'user', content: question, timestamp: new Date() },
        { role: 'assistant', content: response.message, timestamp: new Date(), metadata: response.metadata }
      );
      conversation.lastUpdated = new Date();

      // Send final response
      logger.info('✅ Sending final response to client');
      logger.info('Response structure:', {
        hasMessage: !!response.message,
        hasMetadata: !!response.metadata,
        sourcesCount: response.metadata?.sources?.length || 0
      });
      
      socket.emit('question-response', response);
      logger.info('📤 Response emitted successfully');
      
    } catch (error) {
      logger.error('❌ Socket question handling error:', error);
      logger.error('Error stack:', error.stack);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to process your question. Please try again.';
      
      if (error.message && error.message.includes('embedding')) {
        errorMessage = 'Unable to process your question due to AI service issues. Please try again in a moment.';
      } else if (error.message && error.message.includes('search')) {
        errorMessage = 'Search service is temporarily unavailable. Please try again.';
      } else if (error.message && error.message.includes('404')) {
        errorMessage = 'AI service is temporarily unavailable. Please try again later.';
      } else if (error.message && error.message.includes('authentication')) {
        errorMessage = 'Authentication error with external services. Please contact support.';
      }
      
      socket.emit('error', { message: errorMessage });
    }
  }

  async processQuestion(question, conversation) {
    // This is used for HTTP API, similar logic to socket handler but synchronous response
    try {
      // Use live search
      const liveResults = await this.liveSearchService.comprehensiveSearch(question, {
        size: 20
      });

      let embedding;
      try {
        embedding = await vertexAIService.generateEmbedding(question);
      } catch (error) {
        logger.warn('Embedding generation failed:', error.message);
        embedding = null;
      }
      
      // Optional: Try Elasticsearch for additional indexed content
      let elasticResults = { results: [], total: 0 };
      if (embedding) {
        try {
          elasticResults = await elasticService.hybridSearch(question, {
            embedding,
            types: ['news', 'studies', 'factChecks', 'government'],
            size: 10
          });
        } catch (error) {
          logger.warn('Elasticsearch search failed:', error.message);
        }
      }

      // Combine results
      const allResults = [...liveResults.results, ...elasticResults.results];
      const uniqueResults = this.deduplicateResults(allResults);
      const searchResults = {
        results: uniqueResults.slice(0, 20),
        total: liveResults.total + elasticResults.total,
        sources: liveResults.sources
      };

      const credibilityAnalysis = await vertexAIService.analyzeCredibility(
        question, 
        searchResults.results.slice(0, 8)
      );

      const conversationalResponse = await vertexAIService.generateConversationalResponse(
        question, 
        searchResults.results.slice(0, 12).map(r => ({
          source: r,
          score: r.score || 0,
          highlights: r.highlights || { content: [] }
        })),
        { history: conversation.messages.slice(-6) }
      );

      const followUpQuestions = await vertexAIService.generateFollowUpQuestions([
        ...conversation.messages.slice(-4),
        { role: 'user', content: question },
        { role: 'assistant', content: conversationalResponse }
      ]);

      return {
        message: conversationalResponse,
        metadata: {
          searchStats: {
            totalSources: searchResults.total,
            sourcesAnalyzed: Math.min(20, searchResults.results.length),
            credibilityScore: credibilityAnalysis.credibility_score,
            confidenceLevel: credibilityAnalysis.confidence_level
          },
          sources: searchResults.results.slice(0, 20).map(result => ({
            title: result.title,
            source: result.source,
            url: result.url,
            credibilityScore: result.credibilityScore,
            relevanceScore: result.score || 0,
            publishDate: result.publishDate
          })),
          analysis: credibilityAnalysis,
          followUpQuestions
        }
      };
    } catch (error) {
      logger.error('Question processing error:', error);
      throw error;
    }
  }

  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = `${result.title}-${result.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async getConversationHistory(req, res) {
    try {
      const { conversationId } = req.params;
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json({
        conversationId,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        lastUpdated: conversation.lastUpdated
      });
    } catch (error) {
      logger.error('Get conversation history error:', error);
      res.status(500).json({ error: 'Failed to retrieve conversation history' });
    }
  }
}

module.exports = new ConversationController();