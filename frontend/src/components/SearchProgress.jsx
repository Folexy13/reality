import React from 'react';
import { MagnifyingGlassIcon, ChartBarIcon, CpuChipIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const SearchProgress = ({ progress }) => {
  const stages = {
    'understanding': {
      icon: CpuChipIcon,
      title: 'Understanding',
      color: 'text-reality-blue',
      bgColor: 'bg-reality-blue/10'
    },
    'searching': {
      icon: MagnifyingGlassIcon,
      title: 'Searching',
      color: 'text-reality-orange',
      bgColor: 'bg-reality-orange/10'
    },
    'analyzing': {
      icon: ChartBarIcon,
      title: 'Analyzing',
      color: 'text-reality-orange',
      bgColor: 'bg-reality-orange/10'
    },
    'generating': {
      icon: CheckCircleIcon,
      title: 'Generating Response',
      color: 'text-reality-green',
      bgColor: 'bg-reality-green/10'
    }
  };

  const currentStage = stages[progress.stage] || stages.understanding;
  const IconComponent = currentStage.icon;

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="max-w-[85%] mr-4">
        <div className="bg-white border border-reality-gray-200 shadow-sm rounded-2xl px-4 py-3">
          <div className="flex items-center space-x-3">
            {/* Animated Icon */}
            <div className={`${currentStage.bgColor} p-2 rounded-lg`}>
              <IconComponent className={`h-5 w-5 ${currentStage.color} animate-pulse-slow`} />
            </div>
            
            {/* Progress Content */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-reality-gray-900">
                  {currentStage.title}
                </span>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              
              <p className="text-sm text-reality-gray-600">
                {progress.message}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="bg-reality-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-1000 ${
                  progress.stage === 'understanding' ? 'bg-reality-blue w-1/4' :
                  progress.stage === 'searching' ? 'bg-reality-orange w-1/2' :
                  progress.stage === 'analyzing' ? 'bg-reality-orange w-3/4' :
                  'bg-reality-green w-full'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchProgress;