import React, { useState, useEffect, useRef } from 'react';
import { MessageProps } from '../types';
import { User, Bot, ChevronDown, ChevronRight, Wrench, Star, Play, Pause } from 'lucide-react';
import { marked } from 'marked';
import { apiService } from '../services/api';

const Message: React.FC<MessageProps> = ({ message, isLast = false, voiceEnabled = false }) => {
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isHuman = message.type === 'human';
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

  const toggleToolCall = (toolCallId: string) => {
    setExpandedToolCalls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolCallId)) {
        newSet.delete(toolCallId);
      } else {
        newSet.add(toolCallId);
      }
      return newSet;
    });
  };

  const handleRating = (score: number) => {
    setRating(score);
    // TODO: Submit feedback to API
    if (message.run_id) {
      // apiService.submitFeedback(message.run_id, score);
    }
  };

  const generateAudio = async (): Promise<string | null> => {
    if (!message.content || isHuman || isGeneratingAudio) return null;
    
    try {
      setIsGeneratingAudio(true);
      const audioBlob = await apiService.textToSpeech(message.content);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return url;
    } catch (error) {
      console.error('Failed to generate audio:', error);
      return null;
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playAudio = async () => {
    if (!voiceEnabled || isHuman) return;
    
    let url = audioUrl;
    
    // Generate audio if not already generated
    if (!url) {
      url = await generateAudio();
      if (!url) return;
    }
    
    try {
      // Create new audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          console.error('Audio playback error');
        };
      }
      
      setIsPlaying(true);
      await audioRef.current.play();
    } catch (error) {
      setIsPlaying(false);
      // Silently handle autoplay policy errors
      if (error instanceof Error && 
          !error.message.includes("user didn't interact") && 
          !error.message.includes("play() failed")) {
        console.error('Audio playback failed:', error);
      }
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleAudio = async () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      await playAudio();
    }
  };

  // Auto-play audio for new AI messages if voice is enabled and user has interacted
  useEffect(() => {
    if (voiceEnabled && !isHuman && message.content && isLast) {
      // Don't auto-play for the welcome/greeting message (first message)
      // Only auto-play if the user has previously interacted with the page
      const hasUserInteracted = localStorage.getItem('user-has-interacted') === 'true';
      
      if (hasUserInteracted && message.content !== "Hello! I'm your AI assistant. How can I help you today?") {
        // Small delay to let the message render first
        const timer = setTimeout(() => {
          playAudio();
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [voiceEnabled, isHuman, message.content, isLast]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const renderContent = (content: string) => {
    if (isHuman) {
      return content;
    }
    
    // Render markdown for AI messages
    try {
      const html = marked.parse(content, { 
        breaks: true,
        gfm: true,
      }) as string;
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (error) {
      return content;
    }
  };

  const renderToolCall = (toolCall: any, index: number) => {
    const isExpanded = expandedToolCalls.has(toolCall.id || index.toString());
    
    return (
      <div 
        key={toolCall.id || index}
        className="mt-2 bg-background-secondary border border-border rounded-md overflow-hidden transition-all duration-200 hover:border-primary-500"
      >
        <div 
          className="px-4 py-3 bg-background cursor-pointer border-b border-border hover:bg-background-secondary transition-colors"
          onClick={() => toggleToolCall(toolCall.id || index.toString())}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary-500" />
              <span className="font-medium text-sm text-text">
                {toolCall.name || 'Tool Call'}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-text-secondary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-text-secondary" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {toolCall.args && Object.keys(toolCall.args).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 mt-3">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Arguments
                  </span>
                </div>
                <div className="bg-background border border-border rounded p-3 text-sm font-mono overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(toolCall.args, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {(toolCall.result !== undefined && toolCall.result !== null) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Result
                  </span>
                </div>
                <div className="bg-background border border-border rounded p-3 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {typeof toolCall.result === 'string' 
                      ? toolCall.result 
                      : JSON.stringify(toolCall.result, null, 2)
                    }
                  </pre>
                </div>
              </div>
            )}
            
            {/* Show loading state if tool call has no result yet */}
            {(toolCall.result === undefined || toolCall.result === null) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                    Result
                  </span>
                </div>
                <div className="bg-background border border-border rounded p-3 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Executing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex gap-3 animate-slide-in ${isHuman ? 'flex-row-reverse self-end' : 'self-start'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isHuman 
          ? 'bg-primary-500 text-white' 
          : 'bg-background-secondary text-text-secondary border border-border'
      }`}>
        {isHuman ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className="flex-1 max-w-full">
        <div className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
          isHuman
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-background-secondary text-text border border-border rounded-bl-sm'
        }`}>
          <div className={`prose prose-sm max-w-none ${isHuman ? 'prose-invert' : ''}`}>
            {renderContent(message.content)}
          </div>
        </div>

        {/* Tool Calls */}
        {hasToolCalls && (
          <div className="space-y-2">
            {message.tool_calls!.map((toolCall, index) => 
              renderToolCall(toolCall, index)
            )}
          </div>
        )}

        {/* Audio Player (only for AI messages) */}
        {!isHuman && voiceEnabled && message.content && (
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={toggleAudio}
              disabled={isGeneratingAudio}
              className={`p-2 rounded-full transition-all ${
                isGeneratingAudio
                  ? 'bg-yellow-500 text-white'
                  : isPlaying 
                  ? 'bg-red-500 text-white' 
                  : 'bg-background-secondary text-text-secondary hover:bg-code-background hover:text-text'
              }`}
              title={
                isGeneratingAudio 
                  ? 'Generating audio...' 
                  : isPlaying 
                  ? 'Pause audio' 
                  : 'Play audio'
              }
            >
              {isGeneratingAudio ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Feedback (only for AI messages with run_id) */}
        {!isHuman && message.run_id && isLast && (
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => handleRating(star)}
                className={`p-1 transition-colors ${
                  star <= rating
                    ? 'text-yellow-500'
                    : 'text-border hover:text-yellow-300'
                }`}
                title={`Rate ${star} stars`}
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;