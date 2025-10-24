const { VertexAI } = require('@google-cloud/vertexai');
const logger = require('../utils/logger');

class VertexAIService {
  constructor() {
    this.vertex_ai = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });
    // Use the latest available Gemini models (as of Oct 2025)
    // Try newer models first, with fallbacks to older stable versions
    this.primaryModels = [
      'gemini-2.0-flash-exp',           // Latest experimental flash model
      'gemini-1.5-flash-002',           // Stable 1.5 flash with version
      'gemini-1.5-flash',               // Stable 1.5 flash
    ];
    this.fallbackModels = [
      'gemini-1.5-pro',                 // More capable but slower
      'gemini-1.0-pro',                 // Older stable version
    ];
    this.embeddingModel = 'text-embedding-004';
    
    logger.info(`VertexAI initialized with project: ${process.env.GOOGLE_CLOUD_PROJECT}, location: ${process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'}`);
  }

  async initialize() {
    try {
      // Test the connection
      await this.generateText('Hello, this is a test.');
      logger.info('Vertex AI service initialized successfully');
    } catch (error) {
      logger.error('Vertex AI initialization failed:', error);
      throw error;
    }
  }

  async generateText(prompt, options = {}) {
    // Try primary models first
    const modelsToTry = [...this.primaryModels, ...this.fallbackModels];
    
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelName = modelsToTry[i];
      try {
        if (i > 0) {
          logger.info(`Trying model ${i + 1}/${modelsToTry.length}: ${modelName}...`);
        }
        
        const generativeModel = this.vertex_ai.preview.getGenerativeModel({
          model: modelName,
          generationConfig: {
            candidateCount: 1,
            maxOutputTokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7,
          },
        });

        const request = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        };

        const response = await generativeModel.generateContent(request);
        const text = response.response.candidates[0].content.parts[0].text;
        
        // Success! Cache the working model for future use
        if (!this.workingModel) {
          this.workingModel = modelName;
          logger.info(`✅ Found working model: ${modelName}`);
        }
        
        return text;
      } catch (error) {
        const isLastModel = i === modelsToTry.length - 1;
        
        if (error.message && (error.message.includes('404') || error.message.includes('NOT_FOUND'))) {
          logger.warn(`Model ${modelName} not available (404)`);
          if (isLastModel) {
            logger.error('All models failed with 404 errors');
            throw new Error('No Vertex AI models are available. Please check your Google Cloud setup.');
          }
          // Try next model
          continue;
        } else {
          // Other error (not 404), log it and try next model
          logger.error(`Model ${modelName} error:`, error.message);
          if (isLastModel) {
            throw new Error('AI service temporarily unavailable. Please try again later.');
          }
          continue;
        }
      }
    }
    
    throw new Error('AI service temporarily unavailable. All models failed.');
  }

  async generateEmbedding(text) {
    // Embedding generation is not critical for search to work
    // Skip embeddings for now - we'll use text-only search
    logger.warn('Embedding generation skipped - using text-only search');
    return null;
  }

  async analyzeCredibility(content, sources) {
    const prompt = `
    As an expert fact-checker and information analyst, evaluate the credibility of the following content based on the provided sources.

    Content to analyze:
    "${content}"

    Sources:
    ${sources.map((source, index) => `
    ${index + 1}. ${source.title || 'No title'}
       - Source: ${source.source || 'Unknown'}
       - URL: ${source.url || 'No URL'}
       - Excerpt: ${(source.content || source.snippet || 'No content').substring(0, 300)}...
    `).join('')}

    Provide analysis in the following JSON format:
    {
      "credibility_score": 0.0-1.0,
      "confidence_level": "high|medium|low",
      "key_findings": ["finding1", "finding2", "finding3"],
      "source_reliability": {
        "high": ["source1", "source2"],
        "medium": ["source3"],
        "low": ["source4"]
      },
      "consensus": "strong_agreement|moderate_agreement|mixed|conflicting",
      "red_flags": ["flag1", "flag2"],
      "verification_needed": ["claim1", "claim2"],
      "summary": "Brief summary of the analysis"
    }

    Be thorough but concise. Focus on factual accuracy, source quality, and potential biases.
    `;

    try {
      const response = await this.generateText(prompt, { temperature: 0.3 });
      
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Credibility analysis error:', error);
      // Return a fallback analysis
      return {
        credibility_score: 0.5,
        confidence_level: "low",
        key_findings: ["Analysis failed - manual review needed"],
        source_reliability: { high: [], medium: [], low: [] },
        consensus: "mixed",
        red_flags: ["AI analysis unavailable"],
        verification_needed: [content],
        summary: "Unable to complete automated analysis"
      };
    }
  }

  async generateConversationalResponse(question, searchResults, context = {}) {
    const prompt = `
    You are "Reality Check," an AI assistant that helps people navigate information by providing balanced, thoughtful analysis. 
    
    User Question: "${question}"

    Search Results (${searchResults.length} sources found):
    ${searchResults.map((result, index) => `
    ${index + 1}. ${result.source.title}
       - Source: ${result.source.source} (Credibility: ${result.source.credibilityScore}/1.0)
       - Published: ${result.source.publishDate}
       - Key excerpt: ${result.highlights.content ? result.highlights.content.join('...') : result.source.content.substring(0, 200)}...
       - URL: ${result.source.url}
    `).join('')}

    Previous conversation context: ${context.history ? context.history.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n') : 'None'}

    Instructions:
    1. Provide a thoughtful, balanced response that acknowledges complexity
    2. Reference specific sources when making claims
    3. If evidence is mixed, explain the different perspectives clearly
    4. Include credibility assessment of sources when relevant
    5. Be conversational but authoritative
    6. If you can't find sufficient information, be transparent about limitations
    7. Suggest follow-up questions if appropriate
    8. Use "I found X studies/articles..." to show your search process
    9. Never claim absolute certainty - use phrases like "evidence suggests" or "according to reliable sources"
    10. If the topic is controversial, present multiple viewpoints fairly

    Response format: Provide a natural, conversational response (not JSON). Be engaging but factual.
    `;

    try {
      const response = await this.generateText(prompt, { 
        temperature: 0.6,
        maxTokens: 1500
      });
      return response;
    } catch (error) {
      logger.error('Conversational response generation error:', error);
      throw error;
    }
  }

  async generateFollowUpQuestions(conversation) {
    const prompt = `
    Based on this conversation about fact-checking and information verification, suggest 3 relevant follow-up questions the user might want to ask.

    Conversation:
    ${conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

    Generate 3 questions that would help the user dig deeper into the topic, explore related claims, or understand different aspects of the issue.

    Format as a JSON array: ["Question 1?", "Question 2?", "Question 3?"]
    `;

    try {
      const response = await this.generateText(prompt, { temperature: 0.7 });
      
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Follow-up questions generation error:', error);
      return [
        "Can you tell me more about the sources for this information?",
        "What are the main counterarguments to this claim?",
        "How has expert opinion on this topic evolved over time?"
      ];
    }
  }

  async detectBias(text, source) {
    const prompt = `
    Analyze the following text for potential bias, inflammatory language, or misleading information.

    Text: "${text}"
    Source: ${source}

    Provide analysis in JSON format:
    {
      "bias_score": 0.0-1.0,
      "bias_types": ["political", "commercial", "confirmation", "etc"],
      "inflammatory_language": ["word1", "phrase2"],
      "emotional_indicators": ["urgent", "shocking", "etc"],
      "missing_context": ["important context that's missing"],
      "balanced_assessment": "brief assessment"
    }
    `;

    try {
      const response = await this.generateText(prompt, { temperature: 0.3 });
      
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Bias detection error:', error);
      return {
        bias_score: 0.5,
        bias_types: [],
        inflammatory_language: [],
        emotional_indicators: [],
        missing_context: [],
        balanced_assessment: "Unable to complete bias analysis"
      };
    }
  }
}

module.exports = new VertexAIService();