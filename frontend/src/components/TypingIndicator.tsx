import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex gap-3 animate-slide-in self-start">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-background-secondary text-text-secondary border border-border">
        <Bot className="w-4 h-4" />
      </div>

      {/* Typing Animation */}
      <div className="bg-background-secondary text-text border border-border px-4 py-3 rounded-lg rounded-bl-sm">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-text-muted rounded-full animate-typing-bounce"></div>
          <div className="w-1 h-1 bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-1 bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;