import React, { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

const QuestionInput = ({ onSend, disabled, placeholder }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-2">
      <div className="flex-1">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 border border-reality-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-reality-blue focus:border-transparent disabled:bg-reality-gray-100 disabled:text-reality-gray-500"
          style={{
            minHeight: '50px',
            maxHeight: '120px',
            overflowY: input.length > 100 ? 'auto' : 'hidden'
          }}
        />
      </div>
      
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="bg-reality-blue text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-reality-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
      >
        <PaperAirplaneIcon className="h-5 w-5" />
      </button>
    </form>
  );
};

export default QuestionInput;