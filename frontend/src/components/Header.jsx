import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-reality-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-reality-blue to-reality-green p-2 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Reality Check</h1>
              <p className="text-sm text-reality-gray-600">AI Information Navigator</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link 
              to="/chat" 
              className="btn-primary flex items-center space-x-2"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span>Start Checking</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;