import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Square } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  voiceEnabled?: boolean;
  onVoiceError?: (error: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  voiceEnabled = true,
  onVoiceError
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    isTranscribing,
    toggleRecording,
  } = useVoice({
    enabled: voiceEnabled,
    onTranscription: (text) => {
      setMessage(prev => prev + (prev ? ' ' : '') + text);
      // Focus textarea after transcription
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    },
    onError: onVoiceError,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max height 120px
    textarea.style.height = `${newHeight}px`;
  };

  // Auto-resize on mount and when message changes externally
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="p-4 border-t border-border bg-background">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-background border border-border rounded-xl shadow-light focus-within:border-primary-500 focus-within:shadow-primary-500/20 focus-within:shadow-md transition-all">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Assistant..."
              className="w-full px-4 py-3 pr-20 bg-transparent border-none rounded-xl resize-none focus:outline-none text-sm text-text placeholder-text-muted min-h-[20px] max-h-[120px]"
              disabled={disabled}
              rows={1}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Voice Button */}
              {voiceEnabled && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={disabled || isTranscribing}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse-recording'
                      : isTranscribing
                      ? 'bg-yellow-500 text-white'
                      : 'bg-background-secondary text-text-secondary hover:bg-code-background hover:text-text'
                  } ${disabled || isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={
                    isRecording 
                      ? 'Stop recording' 
                      : isTranscribing 
                      ? 'Transcribing...' 
                      : 'Voice input'
                  }
                >
                  {isRecording ? (
                    <Square className="w-4 h-4" />
                  ) : isTranscribing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={!canSend}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  canSend
                    ? 'bg-primary-500 text-white hover:bg-primary-600 hover:scale-105'
                    : 'bg-background-secondary text-text-muted cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;