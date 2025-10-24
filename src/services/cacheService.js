const redis = require('redis');
const logger = require('../utils/logger');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initializeClient();
  }

  async initializeClient() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection attempts exceeded');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      this.isConnected = false;
    }
  }

  /**
   * Generate a cache key from a question
   * @param {string} question - User question
   * @returns {string} - Normalized cache key
   */
  generateCacheKey(question) {
    // Normalize: lowercase, trim, remove extra spaces
    const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ');
    // Use hash for consistent key length
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return `search:${hash}:${normalized.substring(0, 50)}`;
  }

  /**
   * Get cached search results
   * @param {string} question - User question
   * @returns {Object|null} - Cached results or null
   */
  async getCachedSearch(question) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache lookup');
      return null;
    }

    try {
      const key = this.generateCacheKey(question);
      const cached = await this.client.get(key);
      
      if (cached) {
        logger.info(`✅ Cache HIT for question: "${question.substring(0, 50)}..."`);
        const data = JSON.parse(cached);
        
        // Add cache metadata
        return {
          ...data,
          _cached: true,
          _cachedAt: data._timestamp,
          _cacheAge: Date.now() - data._timestamp
        };
      }
      
      logger.info(`❌ Cache MISS for question: "${question.substring(0, 50)}..."`);
      return null;
    } catch (error) {
      logger.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache search results
   * @param {string} question - User question
   * @param {Object} results - Search results to cache
   * @param {number} ttl - Time to live in seconds (default: 1 hour)
   */
  async cacheSearchResults(question, results, ttl = 3600) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache write');
      return;
    }

    try {
      const key = this.generateCacheKey(question);
      
      // Add timestamp to cached data
      const dataToCache = {
        ...results,
        _timestamp: Date.now(),
        _question: question
      };
      
      await this.client.setEx(key, ttl, JSON.stringify(dataToCache));
      logger.info(`💾 Cached results for question: "${question.substring(0, 50)}..." (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Cache write error:', error);
    }
  }

  /**
   * Invalidate cache for a specific question
   * @param {string} question - User question
   */
  async invalidateCache(question) {
    if (!this.isConnected) return;

    try {
      const key = this.generateCacheKey(question);
      await this.client.del(key);
      logger.info(`🗑️ Invalidated cache for: "${question.substring(0, 50)}..."`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all search caches
   */
  async clearAllSearchCaches() {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys('search:*');
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`🗑️ Cleared ${keys.length} cached searches`);
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('stats');
      const keys = await this.client.keys('search:*');
      
      return {
        connected: true,
        totalSearchCaches: keys.length,
        redisInfo: info
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Cache conversation data
   * @param {string} conversationId - Conversation ID
   * @param {Object} conversation - Conversation object
   * @param {number} ttl - Time to live in seconds (default: 24 hours)
   */
  async cacheConversation(conversationId, conversation, ttl = 86400) {
    if (!this.isConnected) return;

    try {
      const key = `conversation:${conversationId}`;
      await this.client.setEx(key, ttl, JSON.stringify(conversation));
      logger.info(`💾 Cached conversation: ${conversationId}`);
    } catch (error) {
      logger.error('Conversation cache error:', error);
    }
  }

  /**
   * Get cached conversation
   * @param {string} conversationId - Conversation ID
   */
  async getCachedConversation(conversationId) {
    if (!this.isConnected) return null;

    try {
      const key = `conversation:${conversationId}`;
      const cached = await this.client.get(key);
      
      if (cached) {
        logger.info(`✅ Retrieved cached conversation: ${conversationId}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Conversation retrieval error:', error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

module.exports = new CacheService();
