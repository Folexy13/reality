import React from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const MessageBubble = ({ message, onSuggestionClick }) => {
  const isUser = message.role === 'user';
  const metadata = message.metadata || {};

  // Safely extract content
  const content = message.content || message.message || '';
  
  if (!content && !isUser) {
    console.warn('Message has no content:', message);
  }

  const getCredibilityColor = (score) => {
    if (score >= 0.8) return 'text-reality-green';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-reality-orange';
    return 'text-reality-red';
  };

  const getCredibilityIcon = (score) => {
    if (score >= 0.7) return CheckCircleIcon;
    if (score >= 0.4) return ExclamationTriangleIcon;
    return InformationCircleIcon;
  };

  const getConfidenceColor = (level) => {
    const colors = {
      'high': 'bg-reality-green text-white',
      'medium': 'bg-yellow-500 text-white',
      'low': 'bg-reality-red text-white'
    };
    return colors[level] || 'bg-reality-gray-500 text-white';
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[85%] ${isUser ? 'ml-4' : 'mr-4'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-reality-blue text-white ml-auto'
              : 'bg-white border border-reality-gray-200 shadow-sm'
          }`}
        >
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            {isUser ? (
              <p className="text-white m-0">{content}</p>
            ) : content ? (
              <ReactMarkdown
                className="text-reality-gray-800 m-0"
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-reality-gray-900">{children}</strong>,
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-reality-gray-500 italic m-0">No response received</p>
            )}
          </div>

          {/* Metadata Display */}
          {metadata && !isUser && (
            <div className="mt-4 pt-4 border-t border-reality-gray-200">
              {/* Search Stats */}
              {metadata.searchStats && (
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <ChartBarIcon className="h-4 w-4 text-reality-gray-500" />
                    <span className="text-sm text-reality-gray-600">
                      {metadata.searchStats.sourcesAnalyzed} sources analyzed
                    </span>
                  </div>
                  
                  {metadata.searchStats.credibilityScore && (
                    <div className="flex items-center space-x-2">
                      {React.createElement(
                        getCredibilityIcon(metadata.searchStats.credibilityScore),
                        { className: `h-4 w-4 ${getCredibilityColor(metadata.searchStats.credibilityScore)}` }
                      )}
                      <span className={`text-sm font-medium ${getCredibilityColor(metadata.searchStats.credibilityScore)}`}>
                        {Math.round(metadata.searchStats.credibilityScore * 100)}% credible
                      </span>
                    </div>
                  )}
                  
                  {metadata.searchStats.confidenceLevel && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(metadata.searchStats.confidenceLevel)}`}>
                      {metadata.searchStats.confidenceLevel} confidence
                    </span>
                  )}
                </div>
              )}

              {/* Key Findings */}
              {metadata.analysis?.key_findings && metadata.analysis.key_findings.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-reality-gray-900 mb-2">Key Findings:</h4>
                  <ul className="text-sm text-reality-gray-700 space-y-1">
                    {metadata.analysis.key_findings.slice(0, 3).map((finding, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-reality-blue mt-1">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Source Count */}
              {metadata.sources && metadata.sources.length > 0 && (
                <div className="text-sm text-reality-gray-600 mb-3">
                  Based on {metadata.sources.length} sources including {
                    [...new Set(metadata.sources.map(s => s.source))].slice(0, 3).join(', ')
                  }
                  {metadata.sources.length > 3 && ' and others'}
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          {message.suggestions && (
            <div className="mt-4">
              <p className="text-sm text-reality-gray-600 mb-2">Try asking:</p>
              <div className="space-y-2">
                {message.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="block w-full text-left text-sm text-reality-blue hover:text-reality-blue/80 hover:bg-reality-blue/5 p-2 rounded-lg transition-colors"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Questions */}
          {metadata?.followUpQuestions && (
            <div className="mt-4">
              <p className="text-sm text-reality-gray-600 mb-2">You might also ask:</p>
              <div className="space-y-2">
                {metadata.followUpQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(question)}
                    className="block w-full text-left text-sm text-reality-blue hover:text-reality-blue/80 hover:bg-reality-blue/5 p-2 rounded-lg transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-reality-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;