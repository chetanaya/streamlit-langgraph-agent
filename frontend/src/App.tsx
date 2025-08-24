import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Chat from './components/Chat';

function App() {
  return (
    <Router>
      <div className="App h-screen">
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/chat/:threadId?" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
