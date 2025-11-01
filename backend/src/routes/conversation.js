const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

// Start a new conversation
router.post('/start', conversationController.startConversation.bind(conversationController));

// Ask a question in a conversation
router.post('/ask', conversationController.askQuestion.bind(conversationController));

// Get conversation history
router.get('/:conversationId/history', conversationController.getConversationHistory.bind(conversationController));

module.exports = router;