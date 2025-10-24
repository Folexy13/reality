import React, { useState } from 'react';
import { 
  DocumentTextIcon,
  LinkIcon,
  CalendarIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const SourcesPanel = ({ sources }) => {
  const [expandedSources, setExpandedSources] = useState(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleSourceExpansion = (index) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSources(newExpanded);
  };

  const getCredibilityIcon = (score) => {
    if (score >= 0.8) return CheckBadgeIcon;
    if (score >= 0.6) return InformationCircleIcon;
    return ExclamationTriangleIcon;
  };

  const getCredibilityColor = (score) => {
    if (score >= 0.8) return 'text-reality-green';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-reality-orange';
  };

  const getCredibilityBadge = (score) => {
    if (score >= 0.8) return { label: 'High', color: 'bg-reality-green' };
    if (score >= 0.6) return { label: 'Medium', color: 'bg-yellow-500' };
    if (score >= 0.4) return { label: 'Low', color: 'bg-reality-orange' };
    return { label: 'Very Low', color: 'bg-reality-red' };
  };

  if (!sources || sources.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <DocumentTextIcon className="h-5 w-5 text-reality-gray-500" />
          <h3 className="text-lg font-semibold text-reality-gray-900">Sources</h3>
        </div>
        <p className="text-reality-gray-600">
          Sources will appear here once you ask a question.
        </p>
      </div>
    );
  }

  const displayedSources = showAll ? sources : sources.slice(0, 5);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5 text-reality-gray-500" />
          <h3 className="text-lg font-semibold text-reality-gray-900">
            Sources ({sources.length})
          </h3>
        </div>
        
        {sources.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-reality-blue hover:text-reality-blue/80"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayedSources.map((source, index) => {
          const CredibilityIcon = getCredibilityIcon(source.credibilityScore);
          const credibilityBadge = getCredibilityBadge(source.credibilityScore);
          const isExpanded = expandedSources.has(index);

          return (
            <div key={index} className="border border-reality-gray-200 rounded-lg p-3 hover:bg-reality-gray-50 transition-colors">
              {/* Source Header */}
              <div className="flex items-start space-x-2">
                <CredibilityIcon className={`h-4 w-4 mt-1 flex-shrink-0 ${getCredibilityColor(source.credibilityScore)}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-reality-gray-900 line-clamp-2">
                    {source.title}
                  </h4>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-reality-gray-600">
                      {source.source}
                    </span>
                    
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${credibilityBadge.color}`}>
                      {credibilityBadge.label}
                    </span>
                    
                    {source.relevanceScore && (
                      <span className="text-xs text-reality-gray-500">
                        {Math.round(source.relevanceScore * 100)}% relevant
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center space-x-3 mt-2 text-xs text-reality-gray-500">
                    {source.publishDate && (
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          {new Date(source.publishDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <CheckBadgeIcon className="h-3 w-3" />
                      <span>
                        {Math.round(source.credibilityScore * 100)}% credible
                      </span>
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => toggleSourceExpansion(index)}
                    className="flex items-center space-x-1 mt-2 text-xs text-reality-blue hover:text-reality-blue/80"
                  >
                    <span>{isExpanded ? 'Less' : 'More'} details</span>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-3 w-3" />
                    ) : (
                      <ChevronDownIcon className="h-3 w-3" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-reality-gray-200 animate-slide-up">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-xs text-reality-blue hover:text-reality-blue/80 mb-2"
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span>View original source</span>
                      </a>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-reality-gray-700">Credibility:</span>
                          <div className="text-reality-gray-600">
                            {Math.round(source.credibilityScore * 100)}%
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-reality-gray-700">Relevance:</span>
                          <div className="text-reality-gray-600">
                            {Math.round((source.relevanceScore || 0) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-reality-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-reality-gray-700">Avg. Credibility:</span>
              <div className="text-reality-gray-900">
                {Math.round(
                  sources.reduce((sum, s) => sum + s.credibilityScore, 0) / sources.length * 100
                )}%
              </div>
            </div>
            
            <div>
              <span className="font-medium text-reality-gray-700">Source Types:</span>
              <div className="text-reality-gray-900">
                {[...new Set(sources.map(s => s.source))].length} unique
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcesPanel;