import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import Landing from './components/Landing';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-reality-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/chat/:conversationId" element={<ChatInterface />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;