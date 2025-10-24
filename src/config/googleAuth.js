const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Initialize Google Cloud credentials from environment variable
 * Handles both JSON string and file path formats
 */
function initializeGoogleCredentials() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentials) {
    logger.warn('GOOGLE_APPLICATION_CREDENTIALS not set');
    return;
  }

  // Check if it's a file path
  if (credentials.startsWith('/') || credentials.includes(':\\') || credentials.includes('gcp-key.json')) {
    logger.info('Using Google credentials from file path');
    return; // Let Google SDK handle the file path
  }

  // It's a JSON string - parse it and write to temp file
  try {
    const credentialsObj = JSON.parse(credentials);
    
    // Create temp credentials file in project root
    const projectRoot = path.join(__dirname, '../..');
    const tempDir = path.join(projectRoot, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempCredentialsPath = path.join(tempDir, 'gcp-credentials.json');
    fs.writeFileSync(tempCredentialsPath, JSON.stringify(credentialsObj, null, 2));
    
    // Update environment variable to point to the file
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredentialsPath;
    
    logger.info('✅ Google credentials initialized from JSON string');
    logger.info(`Credentials file created at: ${tempCredentialsPath}`);
    logger.info(`Project ID: ${credentialsObj.project_id}`);
    
  } catch (error) {
    logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS JSON:', error.message);
    throw new Error('Invalid Google Cloud credentials format');
  }
}

module.exports = { initializeGoogleCredentials };
