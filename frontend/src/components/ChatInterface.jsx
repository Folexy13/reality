import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import MessageBubble from './MessageBubble';
import SearchProgress from './SearchProgress';
import SourcesPanel from './SourcesPanel';
import QuestionInput from './QuestionInput';
import socketService from '../services/socket';
import apiService from '../services/api';

const ChatInterface = () => {
  const { conversationId: urlConversationId } = useParams();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  
  const [conversationId, setConversationId] = useState(urlConversationId || uuidv4());
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(null);
  const [currentSources, setCurrentSources] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Initialize conversation and socket connection
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Connect to socket
        const socket = socketService.connect();
        
        // Set up socket listeners
        socketService.on('connect', () => setIsConnected(true));
        socketService.on('disconnect', () => setIsConnected(false));
        
        socketService.on('search-progress', (progress) => {
          console.log('📊 Search progress:', progress);
          setSearchProgress(progress);
        });

        socketService.on('question-response', (response) => {
          console.log('✅ Received response:', response);
          setIsLoading(false);
          setSearchProgress(null);
          
          const assistantMessage = {
            id: Date.now(),
            role: 'assistant',
            content: response.message || response.content || 'No response received',
            metadata: response.metadata || {},
            timestamp: new Date()
          };
          
          console.log('Adding assistant message:', assistantMessage);
          setMessages(prev => [...prev, assistantMessage]);
          
          if (response.metadata?.sources) {
            console.log('Setting sources:', response.metadata.sources);
            setCurrentSources(response.metadata.sources);
          }
        });

        socketService.on('error', (error) => {
          console.error('❌ Socket error:', error);
          setIsLoading(false);
          setSearchProgress(null);
          setError(error.message || 'An error occurred');
        });

        // Load existing conversation if ID provided
        if (urlConversationId) {
          try {
            const history = await apiService.getConversationHistory(urlConversationId);
            setMessages(history.messages || []);
          } catch (err) {
            console.error('Failed to load conversation history:', err);
          }
        } else {
          // Start new conversation
          try {
            const newConversation = await apiService.startConversation();
            setConversationId(newConversation.conversationId);
            
            setMessages([{
              id: Date.now(),
              role: 'assistant',
              content: newConversation.message,
              suggestions: newConversation.suggestions,
              timestamp: new Date()
            }]);
          } catch (err) {
            console.error('Failed to start conversation:', err);
            setError('Failed to initialize chat. Please refresh and try again.');
          }
        }

        // Handle pre-filled question from URL
        const prefilledQuestion = searchParams.get('q');
        if (prefilledQuestion) {
          handleSendMessage(prefilledQuestion);
        }

      } catch (err) {
        console.error('Chat initialization error:', err);
        setError('Failed to connect to Reality Check. Please refresh and try again.');
      }
    };

    initializeChat();

    return () => {
      socketService.off('connect');
      socketService.off('disconnect');
      socketService.off('search-progress');
      socketService.off('question-response');
      socketService.off('error');
    };
  }, [urlConversationId, searchParams]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, searchProgress]);

  const handleSendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setSearchProgress({ stage: 'starting', message: 'Preparing to search...' });

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send via socket for real-time updates
    if (socketService.isConnected()) {
      socketService.askQuestion(message, conversationId);
    } else {
      // Fallback to HTTP API
      try {
        const response = await apiService.askQuestion(conversationId, message);
        setIsLoading(false);
        setSearchProgress(null);
        
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.message,
          metadata: response.metadata,
          timestamp: new Date()
        }]);
        
        if (response.metadata?.sources) {
          setCurrentSources(response.metadata.sources);
        }
      } catch (err) {
        setIsLoading(false);
        setSearchProgress(null);
        setError(err.message);
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleRetry = () => {
    setError(null);
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <div className="card h-[70vh] flex flex-col">
            {/* Connection Status */}
            {!isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  Real-time features unavailable. Using standard mode.
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
                <button 
                  onClick={handleRetry}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}
              
              {/* Search Progress */}
              {searchProgress && (
                <SearchProgress progress={searchProgress} />
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <QuestionInput
              onSend={handleSendMessage}
              disabled={isLoading}
              placeholder={
                isLoading 
                  ? "Analyzing your question..." 
                  : "Ask me about any claim, news story, or information you'd like verified..."
              }
            />
          </div>
        </div>

        {/* Sources Panel */}
        <div className="lg:col-span-1">
          <SourcesPanel sources={currentSources} />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;