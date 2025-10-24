# Render Deployment Guide

## Setting up Environment Variables on Render

When deploying to Render, you need to set these environment variables in your dashboard.

### Required Environment Variables

Go to your Render dashboard → Select your web service → Environment tab → Add each variable:

```bash
# Node Environment
NODE_ENV=production
PORT=3001

# Anti-Sleep Service
ENABLE_ANTI_SLEEP=true
BASE_URL=https://your-app-name.onrender.com  # Replace with your actual Render URL

# Frontend
FRONTEND_URL=https://reality-one.vercel.app

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=preplink
GOOGLE_CLOUD_LOCATION=us-central1

# Google Cloud Credentials - IMPORTANT!
# Copy the ENTIRE JSON from your local .env file as ONE SINGLE LINE
# It should look like: {"type":"service_account","project_id":"...","private_key":"..."}
GOOGLE_APPLICATION_CREDENTIALS=<paste-your-json-here-as-single-line>

# Elasticsearch
ELASTICSEARCH_URL=<your-elasticsearch-url>
ELASTICSEARCH_API_KEY=<your-elasticsearch-api-key>

# Redis
REDIS_URL=<your-redis-url>

# API Keys (from your .env file)
NEWS_API_KEY=<your-news-api-key>
GOOGLE_SEARCH_API_KEY=<your-google-search-api-key>
GOOGLE_SEARCH_ENGINE_ID=<your-google-search-engine-id>

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# API Security
REQUIRE_API_KEY=false
VALID_API_KEYS=<your-api-keys-comma-separated>
```

## Important Notes

### 1. Google Cloud Credentials Format

⚠️ **CRITICAL**: The `GOOGLE_APPLICATION_CREDENTIALS` must be a **single-line JSON string** with NO line breaks.

**Correct format:**
```
{"type":"service_account","project_id":"preplink","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}
```

**How to get it:**
1. Copy the value from your local `.env` file
2. Make sure it's ONE continuous line (no line breaks)
3. All `\n` characters in the private key must be preserved
4. Paste directly into Render's environment variable field

### 2. BASE_URL Configuration

After creating your Render service, update `BASE_URL` with your actual Render URL:
```
BASE_URL=https://reality-check-ai.onrender.com
```

This is used by the anti-sleep service to keep your app awake.

### 3. How It Works

The app automatically detects when `GOOGLE_APPLICATION_CREDENTIALS` is a JSON string and:
- Parses the JSON
- Creates a temporary credentials file
- Configures Google Cloud SDK to use it

## Steps to Deploy

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Create a new Web Service on Render**
   - Connect your GitHub repository
   - Select the `backend` branch (or `main`)
   - Build Command: `npm install`
   - Start Command: `node src/server.js`

3. **Add Environment Variables**
   - Copy each variable from your local `.env` file
   - Paste them into Render's Environment tab
   - Make sure `GOOGLE_APPLICATION_CREDENTIALS` is a single line!

4. **Deploy**
   - Render will automatically deploy
   - Check logs for: `✅ Google credentials initialized from JSON string`

## Verifying Deployment

After deployment, check your logs for these success messages:

```
info: ✅ Google credentials initialized from JSON string
info: Credentials file created at: /app/temp/gcp-credentials.json
info: Project ID: preplink
info: VertexAI initialized with project: preplink, location: us-central1
info: Reality Check AI Backend running on port 3001
info: 🚀 Anti-sleep ping service started
```

## Troubleshooting

### Google Cloud Authentication Fails
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is a single line with no extra spaces
- Check that all `\n` escape sequences are preserved in the private key
- Ensure `GOOGLE_CLOUD_LOCATION=us-central1` (not us-west1)

### Anti-Sleep Service Not Working
- Verify `BASE_URL` matches your actual Render URL
- Check that `ENABLE_ANTI_SLEEP=true` is set
- Look for ping logs in your Render dashboard

### Elasticsearch Connection Issues
- Verify `ELASTICSEARCH_URL` includes the full URL with port
- Check that `ELASTICSEARCH_API_KEY` is correct
- Run the data indexer: `node scripts/dataIndexer.js init`

## Security Best Practices

⚠️ **NEVER commit your `.env` file to Git!**
⚠️ **NEVER commit credential files to Git!**
⚠️ **Use Render's environment variables for all secrets**

The `.gitignore` file should include:
```
.env
.env.*
*.pem
*.key
gcp-key.json
temp/
```

## Next Steps After Deployment

1. **Initialize Elasticsearch data** (if deploying for first time):
   - SSH into your Render instance (or use a one-off job)
   - Run: `node scripts/dataIndexer.js init`

2. **Update your frontend** to point to the new backend URL

3. **Test your deployment** by visiting:
   - `https://your-app.onrender.com/api/health`

4. **Monitor logs** for any errors or issues

## Support

If you encounter issues:
1. Check Render logs for error messages
2. Verify all environment variables are set correctly
3. Test your Google Cloud credentials locally first
4. Ensure your Elasticsearch cluster is accessible

---

✅ Your Reality Check AI backend is now ready for production deployment!
