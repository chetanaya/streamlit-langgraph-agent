import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import Message from './Message';
import ChatInput from './ChatInput';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import ShareModal from './ShareModal';
import LoadModal from './LoadModal';
import TypingIndicator from './TypingIndicator';
import { ToastContainer } from './Toast';

import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../hooks/useToast';
import { apiService } from '../services/api';

import { 
  ChatMessage, 
  ChatSettings, 
  AgentInfo, 
  ThreadInfo 
} from '../types';

const Chat: React.FC = () => {
  // URL params and navigation
  const { threadId: urlThreadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  
  const [settings, setSettings] = useState<ChatSettings>({
    model: 'gpt-4o-mini',
    agent: null,
    stream: true,
    voiceEnabled: true,
    alwaysOnVoice: false,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentStreamingMessageRef = useRef<ChatMessage | null>(null);

  // Hooks
  const { toasts, success, error, info, removeToast } = useToast();

  const { sendMessage, isConnected } = useWebSocket({
    onMessage: handleMessage,
    onStreamToken: handleStreamToken,
    onMessageChunk: handleMessageChunk,
    onStreamComplete: handleStreamComplete,
    onError: (errorMessage) => error(errorMessage),
    onConnect: () => info('Connected to chat service'),
    onDisconnect: () => error('Disconnected from chat service'),
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // WebSocket event handlers
  function handleMessage(message: ChatMessage) {
    setMessages(prev => [...prev, { ...message, id: uuidv4(), timestamp: Date.now() }]);
    setIsLoading(false);
    scrollToBottom();
  }

  function handleStreamToken(token: string) {
    setCurrentStreamingMessage(prev => prev + token);
  }

  function handleMessageChunk(chunk: ChatMessage) {
    if (chunk.type === 'ai') {
      if (currentStreamingMessageRef.current) {
        // Update existing streaming message
        currentStreamingMessageRef.current = {
          ...currentStreamingMessageRef.current,
          content: chunk.content || currentStreamingMessageRef.current.content,
          tool_calls: chunk.tool_calls || currentStreamingMessageRef.current.tool_calls,
          run_id: chunk.run_id || currentStreamingMessageRef.current.run_id,
        };
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].type === 'ai') {
            newMessages[lastIndex] = { ...currentStreamingMessageRef.current! };
          }
          return newMessages;
        });
      } else {
        // Start new streaming message (even if content is empty but has tool_calls)
        const newMessage: ChatMessage = {
          type: 'ai',
          content: chunk.content || '',
          tool_calls: chunk.tool_calls,
          run_id: chunk.run_id,
          id: uuidv4(),
          timestamp: Date.now(),
        };
        currentStreamingMessageRef.current = newMessage;
        setMessages(prev => [...prev, newMessage]);
      }
      scrollToBottom();
    } else if (chunk.type === 'tool' && currentStreamingMessageRef.current) {
      // Handle tool result messages - add them to current AI message's tool calls
      if (!currentStreamingMessageRef.current.tool_calls) {
        currentStreamingMessageRef.current.tool_calls = [];
      }
      
      // Find the tool call that matches this result and update it
      const toolCallIndex = currentStreamingMessageRef.current.tool_calls.findIndex(
        tc => tc.id === chunk.tool_call_id
      );
      
      if (toolCallIndex >= 0) {
        currentStreamingMessageRef.current.tool_calls[toolCallIndex] = {
          ...currentStreamingMessageRef.current.tool_calls[toolCallIndex],
          result: chunk.content,
        };
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].type === 'ai') {
            newMessages[lastIndex] = { ...currentStreamingMessageRef.current! };
          }
          return newMessages;
        });
        scrollToBottom();
      }
    }
  }

  function handleStreamComplete() {
    setIsStreaming(false);
    setIsLoading(false);
    setCurrentStreamingMessage('');
    currentStreamingMessageRef.current = null;
    scrollToBottom();
  }

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        // Set thread ID from URL or generate new one
        if (urlThreadId) {
          setCurrentThreadId(urlThreadId);
        } else if (!currentThreadId) {
          const newThreadId = uuidv4();
          setCurrentThreadId(newThreadId);
          navigate(`/chat/${newThreadId}`, { replace: true });
        }

        // Load agent info
        const info = await apiService.getAgentInfo();
        setAgentInfo(info);
        
        // Update settings with defaults from server
        setSettings(prev => ({
          ...prev,
          model: info.default_model || prev.model,
          agent: info.default_agent || prev.agent,
        }));

        // Welcome message will be added by the thread loading effect
        
      } catch (err) {
        error('Failed to initialize chat service');
        console.error('Initialization error:', err);
      }
    };

    init();
  }, []);

  // Load chat history when thread changes
  useEffect(() => {
    const loadHistoryOrShowWelcome = async () => {
      if (currentThreadId) {
        try {
          const history = await apiService.getChatHistory(currentThreadId);
          if (history.messages && history.messages.length > 0) {
            setMessages(history.messages.map(msg => ({
              ...msg,
              id: msg.id || uuidv4(),
              timestamp: msg.timestamp || Date.now(),
            })));
          } else {
            // No messages found, show welcome message
            addWelcomeMessage();
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
          // On error, show welcome message for new chats
          addWelcomeMessage();
        }
      }
    };

    loadHistoryOrShowWelcome();
  }, [currentThreadId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  // Track user interaction for audio autoplay policy
  useEffect(() => {
    const markUserInteracted = () => {
      localStorage.setItem('user-has-interacted', 'true');
    };

    // Listen for various user interaction events
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, markUserInteracted, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, markUserInteracted);
      });
    };
  }, []);

  // Helper functions
  const addWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      id: uuidv4(),
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  };


  const generateNewThread = () => {
    const newThreadId = uuidv4();
    setCurrentThreadId(newThreadId);
    setMessages([]);
    addWelcomeMessage();
    setSidebarOpen(false);
    navigate(`/chat/${newThreadId}`);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !isConnected()) {
      return;
    }

    const userMessage: ChatMessage = {
      type: 'human',
      content: messageText,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    if (settings.stream) {
      setIsStreaming(true);
      setCurrentStreamingMessage('');
    }

    try {
      sendMessage({
        message: messageText,
        model: settings.model,
        thread_id: currentThreadId,
        use_streaming: settings.stream,
        agent: settings.agent || undefined,
      });
    } catch (err) {
      error('Failed to send message');
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleVoiceError = (errorMessage: string) => {
    error(`Voice error: ${errorMessage}`);
  };

  const handleLoadThread = (threadId: string) => {
    setCurrentThreadId(threadId);
    setSidebarOpen(false);
    navigate(`/chat/${threadId}`);
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleShareChat = () => {
    setShareModalOpen(true);
  };

  const handleLoadChat = () => {
    setLoadModalOpen(true);
  };

  const handleLoadChatFromModal = async (threadId: string) => {
    // Navigate to the new thread
    setCurrentThreadId(threadId);
    navigate(`/chat/${threadId}`);
    
    // The thread will be loaded automatically by the useEffect hook
    // that watches for currentThreadId changes
  };

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        threads={threads}
        currentThreadId={currentThreadId}
        onNewChat={generateNewThread}
        onLoadThread={handleLoadThread}
        onOpenSettings={handleOpenSettings}
        onShareChat={handleShareChat}
        onLoadChat={handleLoadChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-text-secondary hover:text-text hover:bg-background-secondary rounded-sm transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-medium text-text">AI Assistant</h1>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="p-2 text-text-secondary hover:text-text hover:bg-background-secondary rounded-sm transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                voiceEnabled={settings.voiceEnabled}
              />
            ))}
            
            {/* Typing Indicator */}
            {(isLoading || isStreaming) && <TypingIndicator />}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || !isConnected()}
          voiceEnabled={settings.voiceEnabled}
          alwaysOnVoice={settings.alwaysOnVoice}
          onVoiceError={handleVoiceError}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        agentInfo={agentInfo}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        currentThreadId={currentThreadId}
      />

      {/* Load Modal */}
      <LoadModal
        isOpen={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        onLoadThread={handleLoadChatFromModal}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default Chat;