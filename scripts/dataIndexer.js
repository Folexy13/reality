const { Client } = require('@elastic/elasticsearch');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const logger = require('../src/utils/logger');

class DataIndexer {
  constructor() {
    const clientConfig = {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
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

    this.client = new Client(clientConfig);

    this.indexes = {
      news: 'reality_check_news',
      studies: 'reality_check_studies',
      factChecks: 'reality_check_fact_checks',
      government: 'reality_check_government',
      social: 'reality_check_social'
    };

    this.sampleDataSources = {
      factChecks: [
        {
          title: "Do electric cars create more pollution than gas cars?",
          content: "While electric cars produce no direct emissions, their overall environmental impact depends on how the electricity is generated and battery production processes. Studies show that even accounting for electricity generation from coal plants, EVs typically produce 50-70% fewer emissions than gasoline cars over their lifetime. The environmental benefits increase as electrical grids become cleaner.",
          claim: "Electric cars are worse for the environment than gas cars",
          verdict: "mostly-false", 
          factchecker: "Climate Fact Check",
          url: "https://example.com/ev-climate-facts",
          source: "Climate Fact Check",
          publishDate: "2024-09-15T00:00:00Z",
          credibilityScore: 0.89,
          tags: ["climate", "transportation", "electric-vehicles", "environment"]
        },
        {
          title: "Miracle cure claims about turmeric supplements",
          content: "While turmeric contains curcumin which has anti-inflammatory properties supported by some studies, claims that turmeric supplements can cure cancer, completely reverse arthritis, or replace all medications are not supported by scientific evidence. Limited bioavailability of curcumin when taken orally also reduces effectiveness.",
          claim: "Turmeric supplements can cure cancer and arthritis",
          verdict: "false",
          factchecker: "Medical Facts Review",
          url: "https://example.com/turmeric-facts",
          source: "Medical Facts Review", 
          publishDate: "2024-09-10T00:00:00Z",
          credibilityScore: 0.91,
          tags: ["health", "supplements", "medical-claims", "cancer"]
        },
        {
          title: "Economic impact of minimum wage increases",
          content: "Economic research on minimum wage increases shows mixed results. Some studies find modest job losses in certain sectors, while others show little to no employment effects. Most economists agree that moderate increases (up to 50% of median wage) have minimal negative employment effects, but there is debate about larger increases.",
          claim: "Minimum wage increases always destroy jobs",
          verdict: "partly-false",
          factchecker: "Economic Policy Institute",
          url: "https://example.com/minimum-wage-analysis", 
          source: "Economic Policy Institute",
          publishDate: "2024-09-12T00:00:00Z",
          credibilityScore: 0.85,
          tags: ["economics", "policy", "employment", "wages"]
        }
      ],

      news: [
        {
          title: "New Study: Electric Vehicle Adoption Accelerating Despite Supply Chain Issues",
          content: "A comprehensive analysis of global electric vehicle sales data shows adoption rates increasing by 40% year-over-year, even as supply chain constraints continue to affect manufacturing. The study, conducted by the International Energy Agency, suggests that consumer demand is outpacing production capacity in most major markets.",
          url: "https://example.com/ev-adoption-study",
          source: "Reuters",
          outlet: "Reuters",
          bias_rating: "center",
          publishDate: "2024-09-20T00:00:00Z",
          credibilityScore: 0.92,
          tags: ["electric-vehicles", "transportation", "business", "environment"]
        },
        {
          title: "Health Officials Warn Against Unregulated Supplement Marketing",
          content: "Federal regulators are cracking down on supplement companies making unsubstantiated health claims, particularly those targeting cancer patients and elderly consumers. The FDA has issued warning letters to 12 companies in the past month for marketing products with misleading therapeutic claims.",
          url: "https://example.com/supplement-regulation-news",
          source: "Associated Press",
          outlet: "Associated Press", 
          bias_rating: "center",
          publishDate: "2024-09-18T00:00:00Z",
          credibilityScore: 0.94,
          tags: ["health", "regulation", "supplements", "FDA"]
        }
      ],

      studies: [
        {
          title: "Life Cycle Assessment of Electric Vehicles vs Internal Combustion Engine Vehicles",
          content: "This peer-reviewed study analyzes the complete environmental impact of electric vehicles compared to traditional gasoline vehicles, including manufacturing, operation, and end-of-life disposal. Results show EVs produce 45-75% fewer lifetime emissions depending on regional electricity sources.",
          journal: "Nature Climate Change",
          doi: "10.1038/s41558-024-12345-6",
          peer_reviewed: true,
          url: "https://example.com/ev-lifecycle-study",
          source: "Nature Climate Change",
          publishDate: "2024-08-15T00:00:00Z",
          credibilityScore: 0.96,
          tags: ["climate", "transportation", "lifecycle-analysis", "electric-vehicles"]
        },
        {
          title: "Curcumin Bioavailability and Therapeutic Efficacy: A Systematic Review",
          content: "Systematic review of 127 clinical trials examining curcumin's therapeutic effects. While anti-inflammatory properties are well-established, evidence for cancer treatment remains limited to in-vitro and animal studies. Poor oral bioavailability remains a significant challenge for therapeutic applications.",
          journal: "Journal of Clinical Medicine",
          doi: "10.3390/jcm13091234",
          peer_reviewed: true,
          url: "https://example.com/curcumin-review-study",
          source: "Journal of Clinical Medicine",
          publishDate: "2024-07-22T00:00:00Z",
          credibilityScore: 0.93,
          tags: ["health", "supplements", "systematic-review", "curcumin"]
        }
      ],

      government: [
        {
          title: "EPA Greenhouse Gas Emissions Standards for Light-Duty Vehicles",
          content: "The Environmental Protection Agency has established comprehensive standards for greenhouse gas emissions from light-duty vehicles. The regulations require automakers to reduce fleet-wide emissions by 5-10% annually through 2032, which is expected to accelerate electric vehicle adoption.",
          url: "https://example.com/epa-emissions-standards",
          source: "EPA",
          publishDate: "2024-09-01T00:00:00Z",
          credibilityScore: 0.98,
          tags: ["regulation", "environment", "transportation", "EPA"]
        },
        {
          title: "FDA Guidance on Dietary Supplement Health Claims",
          content: "The Food and Drug Administration provides clear guidance on permissible health claims for dietary supplements. Companies cannot claim their products diagnose, treat, cure, or prevent diseases without FDA approval through the drug approval process.",
          url: "https://example.com/fda-supplement-guidance", 
          source: "FDA",
          publishDate: "2024-08-30T00:00:00Z",
          credibilityScore: 0.99,
          tags: ["health", "regulation", "supplements", "FDA"]
        }
      ]
    };
  }

  async initialize() {
    try {
      // Test connection
      const health = await this.client.cluster.health();
      logger.info('Connected to Elasticsearch:', health.status);

      // Create indexes
      await this.createIndexes();
      
      // Load sample data
      await this.loadSampleData();
      
      logger.info('Data indexing completed successfully');
    } catch (error) {
      logger.error('Data indexing failed:', error);
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
        } else {
          logger.info(`Index already exists: ${index}`);
        }
      } catch (error) {
        logger.error(`Failed to create index ${index}:`, error);
        throw error;
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

  async loadSampleData() {
    logger.info('Loading sample data...');
    
    for (const [dataType, documents] of Object.entries(this.sampleDataSources)) {
      if (this.indexes[dataType]) {
        try {
          const body = documents.flatMap(doc => [
            { index: { _index: this.indexes[dataType] } },
            doc
          ]);

          const response = await this.client.bulk({ 
            refresh: true, 
            body 
          });

          if (response.errors) {
            logger.warn(`Some ${dataType} documents failed to index:`, 
              response.items.filter(item => item.index.error)
            );
          } else {
            logger.info(`Indexed ${documents.length} ${dataType} documents`);
          }
        } catch (error) {
          logger.error(`Failed to index ${dataType} data:`, error);
        }
      }
    }
  }

  async addDocumentsFromFile(filePath, indexType) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const documents = JSON.parse(data);
      
      if (!Array.isArray(documents)) {
        throw new Error('File must contain an array of documents');
      }

      const index = this.indexes[indexType];
      if (!index) {
        throw new Error(`Unknown index type: ${indexType}`);
      }

      const body = documents.flatMap(doc => [
        { index: { _index: index } },
        doc
      ]);

      const response = await this.client.bulk({ 
        refresh: true, 
        body 
      });

      if (response.errors) {
        logger.warn('Some documents failed to index:', 
          response.items.filter(item => item.index.error)
        );
      }

      logger.info(`Successfully indexed ${documents.length} documents to ${index}`);
      return response;
    } catch (error) {
      logger.error('Failed to add documents from file:', error);
      throw error;
    }
  }

  async fetchAndIndexNews(apiKey, sources = ['reuters', 'ap-news', 'bbc-news']) {
    // This would integrate with real news APIs like NewsAPI, but for demo we'll use sample data
    logger.info('News API integration would go here');
    logger.info('For production, integrate with NewsAPI, Google News API, or RSS feeds');
  }

  async fetchAndIndexFactChecks() {
    // This would integrate with fact-checking APIs
    logger.info('Fact-checking API integration would go here');
    logger.info('For production, integrate with PolitiFact, Snopes, or FactCheck.org APIs');
  }

  async getIndexStats() {
    const stats = {};
    
    for (const [name, index] of Object.entries(this.indexes)) {
      try {
        const response = await this.client.search({
          index,
          body: {
            size: 0,
            aggs: {
              avg_credibility: {
                avg: { field: 'credibilityScore' }
              },
              sources: {
                terms: { field: 'source', size: 10 }
              }
            }
          }
        });
        
        stats[name] = {
          total: response.hits.total.value,
          avgCredibility: response.aggregations.avg_credibility.value,
          sources: response.aggregations.sources.buckets
        };
      } catch (error) {
        logger.error(`Failed to get stats for ${index}:`, error);
        stats[name] = { error: error.message };
      }
    }
    
    return stats;
  }
}

// CLI usage
if (require.main === module) {
  const indexer = new DataIndexer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      indexer.initialize()
        .then(() => {
          console.log('✅ Data indexing completed successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Data indexing failed:', error.message);
          process.exit(1);
        });
      break;
      
    case 'stats':
      indexer.getIndexStats()
        .then((stats) => {
          console.log('📊 Index Statistics:');
          console.log(JSON.stringify(stats, null, 2));
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Failed to get stats:', error.message);
          process.exit(1);
        });
      break;
      
    case 'add':
      const filePath = process.argv[3];
      const indexType = process.argv[4];
      
      if (!filePath || !indexType) {
        console.error('Usage: node dataIndexer.js add <file-path> <index-type>');
        console.error('Index types: news, studies, factChecks, government, social');
        process.exit(1);
      }
      
      indexer.addDocumentsFromFile(filePath, indexType)
        .then(() => {
          console.log('✅ Documents added successfully');
          process.exit(0);
        })
        .catch((error) => {
          console.error('❌ Failed to add documents:', error.message);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node dataIndexer.js init     - Initialize indexes and load sample data');
      console.log('  node dataIndexer.js stats    - Show index statistics');
      console.log('  node dataIndexer.js add <file> <type> - Add documents from file');
      process.exit(1);
  }
}

module.exports = DataIndexer;