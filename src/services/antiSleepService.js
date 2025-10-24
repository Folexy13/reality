const cron = require('node-cron');
const axios = require('axios');
const logger = require('../utils/logger');

class AntiSleepService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.pingCount = 0;
    this.lastPingTime = null;
    this.failureCount = 0;
  }

  /**
   * Initialize and start the anti-sleep ping service
   * Runs every 5 minutes to keep the server awake
   */
  start() {
    if (this.isRunning) {
      logger.warn('⚠️ Anti-sleep service is already running');
      return;
    }

    // Cron pattern: '*/5 * * * *' means every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.ping();
    });

    this.isRunning = true;
    logger.info('🚀 Anti-sleep ping service started - will ping every 5 minutes');
    
    // Perform initial ping
    this.ping();
  }

  /**
   * Perform the ping operation
   */
  async ping() {
    try {
      this.pingCount++;
      const startTime = Date.now();
      
      logger.info(`🏓 Anti-sleep ping #${this.pingCount} initiated...`);
      
      // Ping the health endpoint
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      const healthUrl = `${baseUrl}/api/health`;
      
      const response = await axios.get(healthUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'AntiSleepService/1.0'
        }
      });
      
      const duration = Date.now() - startTime;
      this.lastPingTime = new Date();
      this.failureCount = 0; // Reset failure count on success
      
      logger.info(`✅ Anti-sleep ping #${this.pingCount} successful (${duration}ms)`, {
        status: response.status,
        timestamp: this.lastPingTime.toISOString()
      });
      
    } catch (error) {
      this.failureCount++;
      logger.error(`❌ Anti-sleep ping #${this.pingCount} failed (attempt ${this.failureCount}):`, {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // If we have too many consecutive failures, something might be wrong
      if (this.failureCount >= 3) {
        logger.error('🚨 Anti-sleep service: 3 consecutive failures detected');
      }
    }
  }

  /**
   * Stop the anti-sleep service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      logger.info('🛑 Anti-sleep ping service stopped');
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pingCount: this.pingCount,
      lastPingTime: this.lastPingTime,
      failureCount: this.failureCount,
      nextPing: this.isRunning ? 'Within 5 minutes' : 'Service not running'
    };
  }
}

// Create singleton instance
const antiSleepService = new AntiSleepService();

module.exports = antiSleepService;
