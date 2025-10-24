const { VertexAI } = require('@google-cloud/vertexai');

const project = 'preplink';
const location = 'us-central1';

console.log('\n=== Testing Vertex AI Configuration ===\n');
console.log('Project:', project);
console.log('Location:', location);
console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

async function testVertexAI() {
  try {
    console.log('\n1. Initializing Vertex AI...');
    const vertexAI = new VertexAI({ project, location });
    console.log('✅ Vertex AI client initialized successfully');

    // Test different model names to see which ones work
    const modelsToTest = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash-002',
      'gemini-1.5-pro',
      'gemini-1.0-pro',
      'gemini-pro',
    ];

    console.log('\n2. Testing available models...\n');

    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing: ${modelName}...`);
        const model = vertexAI.preview.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.7,
          },
        });

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Say hello' }] }],
        });

        const text = response.response.candidates[0].content.parts[0].text;
        console.log(`✅ ${modelName} works! Response: ${text.substring(0, 50)}...\n`);
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
          console.log(`❌ ${modelName} - Not available (404)\n`);
        } else if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
          console.log(`❌ ${modelName} - Permission denied (403)\n`);
        } else {
          console.log(`❌ ${modelName} - Error: ${error.message}\n`);
        }
      }
    }

    console.log('\n3. Testing embedding model...\n');
    try {
      console.log('Testing: text-embedding-004...');
      const embeddingModel = vertexAI.preview.getGenerativeModel({
        model: 'text-embedding-004',
      });
      console.log('✅ text-embedding-004 initialized (embeddings may work differently)\n');
    } catch (error) {
      console.log(`❌ text-embedding-004 - Error: ${error.message}\n`);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

console.log('\n=== Starting tests ===\n');
testVertexAI()
  .then(() => {
    console.log('\n=== Test completed ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
