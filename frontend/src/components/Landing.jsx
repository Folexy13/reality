import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheckIcon, 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const Landing = () => {
  const exampleQuestions = [
    "I saw a post saying electric cars are worse for the environment than gas cars. Is this true?",
    "My friend shared an article about a new miracle cure. Should I trust it?",
    "I'm seeing conflicting reports about this economic policy. What's actually happening?",
    "Help me understand both sides of this climate change debate I'm seeing online"
  ];

  const features = [
    {
      icon: MagnifyingGlassIcon,
      title: "Multi-Source Search",
      description: "Searches across news articles, academic papers, fact-checking databases, and government reports"
    },
    {
      icon: ShieldCheckIcon,
      title: "Credibility Analysis",
      description: "Analyzes source reliability and provides transparency about where information comes from"
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Conversational Interface", 
      description: "Natural conversations about complex topics, not just true/false answers"
    },
    {
      icon: ChartBarIcon,
      title: "Balanced Analysis",
      description: "Presents multiple perspectives and acknowledges uncertainty when evidence is mixed"
    }
  ];

  const handleExampleClick = (question) => {
    // Navigate to chat with pre-filled question
    const encodedQuestion = encodeURIComponent(question);
    window.location.href = `/chat?q=${encodedQuestion}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="bg-gradient-to-r from-reality-blue to-reality-green p-4 rounded-2xl inline-block mb-6">
          <LightBulbIcon className="h-12 w-12 text-white" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold text-reality-gray-900 mb-6">
          Navigate Information with{' '}
          <span className="text-gradient">Confidence</span>
        </h1>
        
        <p className="text-xl text-reality-gray-600 mb-8 max-w-3xl mx-auto">
          Reality Check is your AI-powered research assistant that helps you verify claims, 
          analyze news, and understand complex information by searching through thousands 
          of credible sources in real-time.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/chat" className="btn-primary text-lg px-8 py-3 flex items-center justify-center space-x-2">
            <span>Start Fact-Checking</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <button 
            onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary text-lg px-8 py-3"
          >
            See How It Works
          </button>
        </div>
      </div>

      {/* Example Questions */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-reality-gray-900 mb-6 text-center">
          Try These Example Questions
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {exampleQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(question)}
              className="card hover:shadow-md transition-shadow duration-200 text-left group cursor-pointer border-2 border-transparent hover:border-reality-blue"
            >
              <div className="flex items-start space-x-3">
                <div className="bg-reality-blue/10 p-2 rounded-lg mt-1">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-reality-blue" />
                </div>
                <div className="flex-1">
                  <p className="text-reality-gray-700 group-hover:text-reality-gray-900">
                    "{question}"
                  </p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-reality-gray-400 group-hover:text-reality-blue transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div id="how-it-works" className="mb-16">
        <h2 className="text-3xl font-bold text-reality-gray-900 mb-12 text-center">
          How Reality Check Works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="bg-gradient-to-r from-reality-blue to-reality-green p-3 rounded-xl inline-block mb-4">
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-reality-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-reality-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Flow */}
      <div className="card mb-16">
        <h2 className="text-2xl font-bold text-reality-gray-900 mb-6 text-center">
          The Reality Check Process
        </h2>
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="bg-reality-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold text-reality-gray-900">Ask Your Question</h3>
              <p className="text-reality-gray-600">
                Ask naturally - "I heard that...", "Is it true that...", "Help me understand..."
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="bg-reality-blue text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold text-reality-gray-900">Real-Time Search</h3>
              <p className="text-reality-gray-600">
                Searches thousands of sources: news articles, academic papers, fact-checks, government reports
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="bg-reality-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold text-reality-gray-900">Credibility Analysis</h3>
              <p className="text-reality-gray-600">
                Analyzes source reliability, identifies bias, and evaluates evidence quality
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="bg-reality-green text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="font-semibold text-reality-gray-900">Balanced Response</h3>
              <p className="text-reality-gray-600">
                Provides nuanced analysis with sources, acknowledges uncertainty, and suggests follow-up questions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <div className="card bg-gradient-to-r from-reality-blue to-reality-green text-white">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Navigate Information with Confidence?
          </h2>
          <p className="text-blue-100 mb-6">
            Join thousands who use Reality Check to verify claims and understand complex topics.
          </p>
          <Link to="/chat" className="bg-white text-reality-blue px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 inline-flex items-center space-x-2">
            <span>Start Your First Check</span>
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;