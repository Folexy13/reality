const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

class ElasticService {
  constructor() {
    // Create configuration for Elasticsearch client
    const clientConfig = {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    };

    // Add authentication if provided
    if (process.env.ELASTICSEARCH_API_KEY) {
      clientConfig.auth = {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      };
    } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      clientConfig.auth = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      };
    }
    // If no auth is provided, try without authentication (for development)

    this.client = new Client(clientConfig);
    this.indexes = {
      news: 'reality_check_news',
      studies: 'reality_check_studies',
      factChecks: 'reality_check_fact_checks',
      government: 'reality_check_government',
      social: 'reality_check_social'
    };
  }

  async initialize() {
    try {
      const health = await this.client.cluster.health();
      logger.info('Elasticsearch connected:', health.status);
      await this.createIndexes();
    } catch (error) {
      logger.error('Elasticsearch connection failed:', error);
      throw error;
    }
  }

  async createIndexes() {
    for (const [name, index] of Object.entries(this.indexes)) {
      try {
        const exists = await this.client.indices.exists({ index });
        if (!exists) {
          await this.client.indices.create({
            index,
            body: this.getIndexMapping(name)
          });
          logger.info(`Created index: ${index}`);
        }
      } catch (error) {
        logger.error(`Failed to create index ${index}:`, error);
      }
    }
  }

  getIndexMapping(type) {
    const baseMapping = {
      mappings: {
        properties: {
          title: { type: 'text', analyzer: 'standard' },
          content: { type: 'text', analyzer: 'standard' },
          url: { type: 'keyword' },
          source: { type: 'keyword' },
          publishDate: { type: 'date' },
          credibilityScore: { type: 'float' },
          tags: { type: 'keyword' },
          embeddings: {
            type: 'dense_vector',
            dims: 768
          }
        }
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            content_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'snowball']
            }
          }
        }
      }
    };

    // Add type-specific fields
    switch (type) {
      case 'news':
        baseMapping.mappings.properties.outlet = { type: 'keyword' };
        baseMapping.mappings.properties.bias_rating = { type: 'keyword' };
        break;
      case 'studies':
        baseMapping.mappings.properties.journal = { type: 'keyword' };
        baseMapping.mappings.properties.doi = { type: 'keyword' };
        baseMapping.mappings.properties.peer_reviewed = { type: 'boolean' };
        break;
      case 'factChecks':
        baseMapping.mappings.properties.claim = { type: 'text' };
        baseMapping.mappings.properties.verdict = { type: 'keyword' };
        baseMapping.mappings.properties.factchecker = { type: 'keyword' };
        break;
    }

    return baseMapping;
  }

  async hybridSearch(query, filters = {}, size = 20) {
    try {
      const searchBody = {
        size,
        query: {
          bool: {
            should: [
              // Keyword search
              {
                multi_match: {
                  query,
                  fields: ['title^2', 'content', 'claim^1.5'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              },
              // Semantic search (if embeddings available)
              ...(filters.embedding ? [{
                script_score: {
                  query: { match_all: {} },
                  script: {
                    source: "cosineSimilarity(params.query_vector, 'embeddings') + 1.0",
                    params: { query_vector: filters.embedding }
                  }
                }
              }] : [])
            ]
          }
        },
        sort: [
          { credibilityScore: { order: 'desc' } },
          { publishDate: { order: 'desc' } },
          '_score'
        ],
        highlight: {
          fields: {
            title: {},
            content: { fragment_size: 150, number_of_fragments: 3 }
          }
        }
      };

      // Add filters
      if (filters.sources && filters.sources.length > 0) {
        searchBody.query.bool.filter = [
          { terms: { source: filters.sources } }
        ];
      }

      if (filters.dateRange) {
        if (!searchBody.query.bool.filter) searchBody.query.bool.filter = [];
        searchBody.query.bool.filter.push({
          range: {
            publishDate: {
              gte: filters.dateRange.from,
              lte: filters.dateRange.to
            }
          }
        });
      }

      // Search across all relevant indexes
      const indexes = this.determineIndexes(filters.types);
      
      const response = await this.client.search({
        index: indexes.join(','),
        body: searchBody
      });

      return this.formatSearchResults(response);
    } catch (error) {
      logger.error('Elasticsearch search error:', error);
      throw error;
    }
  }

  determineIndexes(types) {
    if (!types || types.length === 0) {
      return Object.values(this.indexes);
    }
    
    return types.map(type => this.indexes[type]).filter(Boolean);
  }

  formatSearchResults(response) {
    return {
      total: response.hits.total.value,
      maxScore: response.hits.max_score,
      results: response.hits.hits.map(hit => ({
        id: hit._id,
        index: hit._index,
        score: hit._score,
        source: hit._source,
        highlights: hit.highlight || {}
      }))
    };
  }

  async indexDocument(index, document) {
    try {
      const response = await this.client.index({
        index: this.indexes[index],
        body: document
      });
      return response;
    } catch (error) {
      logger.error('Document indexing error:', error);
      throw error;
    }
  }

  async bulkIndex(index, documents) {
    try {
      const body = documents.flatMap(doc => [
        { index: { _index: this.indexes[index] } },
        doc
      ]);

      const response = await this.client.bulk({ refresh: true, body });
      
      if (response.errors) {
        logger.warn('Some documents failed to index:', response.items.filter(item => item.index.error));
      }

      return response;
    } catch (error) {
      logger.error('Bulk indexing error:', error);
      throw error;
    }
  }

  async getSourceStats() {
    try {
      const stats = {};
      
      for (const [name, index] of Object.entries(this.indexes)) {
        const response = await this.client.search({
          index,
          body: {
            size: 0,
            aggs: {
              sources: {
                terms: { field: 'source', size: 50 }
              },
              credibility_avg: {
                avg: { field: 'credibilityScore' }
              }
            }
          }
        });
        
        stats[name] = {
          total: response.hits.total.value,
          sources: response.aggregations.sources.buckets,
          avgCredibility: response.aggregations.credibility_avg.value
        };
      }
      
      return stats;
    } catch (error) {
      logger.error('Stats retrieval error:', error);
      throw error;
    }
  }
}

module.exports = new ElasticService();