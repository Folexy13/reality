const logger = require('../utils/logger');

class LiveSearchService {
  constructor() {
    // API Configuration
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.bingApiKey = process.env.BING_SEARCH_API_KEY;
  }

  async searchNews(query, options = {}) {
    if (!this.newsApiKey) {
      logger.warn('NewsAPI key not configured, skipping news search');
      return [];
    }

    try {
      logger.info(`Starting NewsAPI search for: ${query}`);
      const params = new URLSearchParams({
        q: query,
        apiKey: this.newsApiKey,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: options.limit || 20
      });

      const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
      const data = await response.json();

      if (!response.ok) {
        logger.error(`NewsAPI error: ${data.message || 'Unknown error'}`);
        throw new Error(`NewsAPI error: ${data.message}`);
      }

      logger.info(`NewsAPI returned ${data.articles?.length || 0} articles`);
      return data.articles.map(article => ({
        title: article.title,
        content: article.description + ' ' + (article.content || ''),
        source: article.source.name,
        url: article.url,
        publishDate: article.publishedAt,
        credibilityScore: this.calculateNewsCredibility(article.source.name),
        type: 'news',
        highlights: {
          title: [article.title],
          content: [article.description]
        }
      }));
    } catch (error) {
      logger.error('NewsAPI search failed:', error);
      return [];
    }
  }

  async searchGoogle(query, options = {}) {
    if (!this.googleApiKey || !this.googleSearchEngineId) {
      logger.warn('Google Search API not configured, skipping web search');
      return [];
    }

    try {
      logger.info(`Starting Google Search for: ${query}`);
      logger.info(`Using API Key: ${this.googleApiKey.substring(0, 10)}...`);
      logger.info(`Using Search Engine ID: ${this.googleSearchEngineId}`);
      
      const params = new URLSearchParams({
        key: this.googleApiKey,
        cx: this.googleSearchEngineId,
        q: query,
        num: options.limit || 10
      });

      const url = `https://www.googleapis.com/customsearch/v1?${params}`;
      logger.info(`Google Search URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        logger.error(`Google Search API error response:`, data);
        throw new Error(`Google Search API error: ${data.error?.message || 'Unknown error'}`);
      }

      logger.info(`Google Search returned ${data.items?.length || 0} results`);
      return (data.items || []).map(item => ({
        title: item.title,
        content: item.snippet,
        source: this.extractDomain(item.link),
        url: item.link,
        publishDate: new Date().toISOString(), // Google doesn't always provide dates
        credibilityScore: this.calculateWebCredibility(item.link),
        type: 'web',
        highlights: {
          title: [item.title],
          content: [item.snippet]
        }
      }));
    } catch (error) {
      logger.error('Google Search API failed:', error);
      return [];
    }
  }

  async searchFactCheckers(query, options = {}) {
    // Search for fact-checking specific terms
    const factCheckQuery = `${query} fact check OR debunked OR verified OR false OR true`;
    const factCheckSites = 'site:snopes.com OR site:politifact.com OR site:factcheck.org OR site:reuters.com/fact-check';
    const enhancedQuery = `${factCheckQuery} ${factCheckSites}`;

    const results = await this.searchGoogle(enhancedQuery, { limit: 10 });
    
    return results.map(result => ({
      ...result,
      type: 'factCheck',
      credibilityScore: Math.min(result.credibilityScore + 0.2, 1.0), // Boost fact-check credibility
      verdict: this.extractVerdict(result.content),
      factchecker: result.source
    }));
  }

  async searchGovernment(query, options = {}) {
    // Search government and official sources
    const govQuery = `${query} site:gov OR site:edu OR site:who.int OR site:cdc.gov OR site:fda.gov OR site:epa.gov`;
    
    const results = await this.searchGoogle(govQuery, { limit: 10 });
    
    return results.map(result => ({
      ...result,
      type: 'government',
      credibilityScore: Math.min(result.credibilityScore + 0.3, 1.0) // High credibility for gov sources
    }));
  }

  async comprehensiveSearch(query, options = {}) {
    logger.info(`Starting comprehensive search for: ${query}`);
    
    const searchPromises = [
      this.searchNews(query, { limit: 15 }),
      this.searchGoogle(query, { limit: 15 }),
      this.searchFactCheckers(query, { limit: 10 }),
      this.searchGovernment(query, { limit: 10 })
    ];

    try {
      const [newsResults, webResults, factCheckResults, govResults] = await Promise.all(searchPromises);
      
      logger.info(`Search results: News=${newsResults.length}, Web=${webResults.length}, FactCheck=${factCheckResults.length}, Gov=${govResults.length}`);
      
      const allResults = [
        ...newsResults,
        ...webResults,
        ...factCheckResults,
        ...govResults
      ];

      // Remove duplicates and sort by credibility and relevance
      const uniqueResults = this.deduplicateResults(allResults);
      const sortedResults = uniqueResults.sort((a, b) => {
        // Sort by credibility score first, then by type priority
        const typePriority = { government: 4, factCheck: 3, news: 2, web: 1 };
        if (a.credibilityScore !== b.credibilityScore) {
          return b.credibilityScore - a.credibilityScore;
        }
        return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
      });

      logger.info(`Found ${sortedResults.length} unique results from live APIs`);
      
      const finalResults = sortedResults.slice(0, options.size || 25).map((result, index) => ({
        ...result,
        score: (sortedResults.length - index) / sortedResults.length // Relevance score
      }));

      const searchResponse = {
        results: finalResults,
        total: sortedResults.length,
        sources: {
          news: newsResults.length,
          web: webResults.length,
          factCheck: factCheckResults.length,
          government: govResults.length
        }
      };

      logger.info(`Final search response:`, {
        totalResults: searchResponse.total,
        returnedResults: searchResponse.results.length,
        sources: searchResponse.sources
      });
      
      return searchResponse;
    } catch (error) {
      logger.error('Comprehensive search failed:', error);
      throw error;
    }
  }

  calculateNewsCredibility(sourceName) {
    const highCredibilityNews = [
      'Reuters', 'Associated Press', 'BBC News', 'NPR', 'PBS NewsHour',
      'The Wall Street Journal', 'The New York Times', 'The Washington Post',
      'The Guardian', 'Financial Times'
    ];
    
    const mediumCredibilityNews = [
      'CNN', 'Fox News', 'MSNBC', 'ABC News', 'CBS News', 'NBC News',
      'Time', 'Newsweek', 'USA Today'
    ];

    if (highCredibilityNews.some(source => sourceName.includes(source))) {
      return 0.9;
    } else if (mediumCredibilityNews.some(source => sourceName.includes(source))) {
      return 0.7;
    } else {
      return 0.5; // Unknown source
    }
  }

  calculateWebCredibility(url) {
    if (url.includes('.gov') || url.includes('.edu')) return 0.9;
    if (url.includes('who.int') || url.includes('cdc.gov') || url.includes('fda.gov')) return 0.95;
    if (url.includes('wikipedia.org')) return 0.7;
    if (url.includes('snopes.com') || url.includes('politifact.com') || url.includes('factcheck.org')) return 0.9;
    return 0.6; // Default for other web sources
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  extractVerdict(content) {
    const verdictWords = {
      'false': 'false',
      'true': 'true', 
      'misleading': 'misleading',
      'partly false': 'partly-false',
      'mostly true': 'mostly-true',
      'debunked': 'false',
      'verified': 'true',
      'unproven': 'unproven'
    };

    const lowerContent = content.toLowerCase();
    for (const [keyword, verdict] of Object.entries(verdictWords)) {
      if (lowerContent.includes(keyword)) {
        return verdict;
      }
    }
    return 'unverified';
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
}

module.exports = LiveSearchService;