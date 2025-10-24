const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize Google Cloud credentials first
const { initializeGoogleCredentials } = require('./config/googleAuth');
initializeGoogleCredentials();

const conversationRoutes = require('./routes/conversation');
const searchRoutes = require('./routes/search');
const analysisRoutes = require('./routes/analysis');
const healthRoutes = require('./routes/health');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { validateApiKey } = require('./middleware/auth');
const antiSleepService = require('./services/antiSleepService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API key validation for protected routes
app.use('/api/conversation', validateApiKey);
app.use('/api/search', validateApiKey);
app.use('/api/analysis', validateApiKey);

// Routes
app.use('/api/conversation', conversationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/health', healthRoutes);

// Socket.IO for real-time communication
io.on('connection', (socket) => {
  logger.info(`✅ Client connected: ${socket.id}`);
  
  socket.on('ask-question', async (data) => {
    try {
      logger.info(`📨 Received question from ${socket.id}:`, {
        question: data.question,
        conversationId: data.conversationId,
        userId: data.userId
      });
      
      const { question, conversationId, userId } = data;
      
      if (!question || !question.trim()) {
        logger.warn('Empty question received');
        socket.emit('error', { message: 'Question cannot be empty' });
        return;
      }
      
      // Emit search progress updates
      socket.emit('search-progress', { stage: 'understanding', message: 'Understanding your question...' });
      logger.info('📊 Emitted search-progress: understanding');
      
      // Process the question (implement in conversation controller)
      const conversationController = require('./controllers/conversationController');
      await conversationController.handleSocketQuestion(socket, data);
      
      logger.info(`✅ Successfully processed question for ${socket.id}`);
      
    } catch (error) {
      logger.error('❌ Socket question handling error:', error);
      socket.emit('error', { message: error.message || 'Failed to process question' });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    logger.error(`🔴 Socket error for ${socket.id}:`, error);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Reality Check AI Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start anti-sleep service in production
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_ANTI_SLEEP === 'true') {
    antiSleepService.start();
  }
});

module.exports = { app, io };