import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to add API key if available
    this.client.interceptors.request.use((config) => {
      const apiKey = import.meta.env.VITE_API_KEY;
      if (apiKey) {
        config.headers['x-api-key'] = apiKey;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        if (error.response?.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (error.response?.status === 401) {
          throw new Error('Authentication required. Please check your API key.');
        }
        if (error.response?.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw error;
      }
    );
  }

  async startConversation() {
    try {
      const response = await this.client.post('/conversation/start');
      return response.data;
    } catch (error) {
      throw new Error('Failed to start conversation: ' + error.message);
    }
  }

  async askQuestion(conversationId, question) {
    try {
      const response = await this.client.post('/conversation/ask', {
        conversationId,
        question
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to ask question: ' + error.message);
    }
  }

  async getConversationHistory(conversationId) {
    try {
      const response = await this.client.get(`/conversation/${conversationId}/history`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to get conversation history: ' + error.message);
    }
  }

  async searchDirect(query, filters = {}) {
    try {
      const response = await this.client.post('/search/query', {
        query,
        filters
      });
      return response.data;
    } catch (error) {
      throw new Error('Search failed: ' + error.message);
    }
  }

  async getSearchStats() {
    try {
      const response = await this.client.get('/search/stats');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get search stats: ' + error.message);
    }
  }

  async analyzeCredibility(content, sources = []) {
    try {
      const response = await this.client.post('/analysis/credibility', {
        content,
        sources
      });
      return response.data;
    } catch (error) {
      throw new Error('Credibility analysis failed: ' + error.message);
    }
  }

  async detectBias(text, source) {
    try {
      const response = await this.client.post('/analysis/bias', {
        text,
        source
      });
      return response.data;
    } catch (error) {
      throw new Error('Bias detection failed: ' + error.message);
    }
  }

  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Health check failed: ' + error.message);
    }
  }
}

export default new ApiService();