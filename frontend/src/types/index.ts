// Message types
export interface ChatMessage {
  type: 'human' | 'ai';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  run_id?: string;
  custom_data?: any;
  timestamp?: number;
  id?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
}

export interface ChatHistory {
  messages: ChatMessage[];
}

// Agent and model types
export interface Agent {
  key: string;
  description: string;
}

export interface AgentInfo {
  agents: Agent[];
  models: string[];
  default_agent: string;
  default_model: string;
}

// Settings types
export interface ChatSettings {
  model: string;
  agent: string | null;
  stream: boolean;
  voiceEnabled: boolean;
  alwaysOnVoice: boolean;
}

// Socket events
export interface SocketEvents {
  send_message: (data: {
    message: string;
    model: string;
    thread_id: string;
    use_streaming: boolean;
    agent?: string;
  }) => void;
  message_response: (data: ChatMessage) => void;
  stream_token: (data: { token: string }) => void;
  message_chunk: (data: ChatMessage) => void;
  stream_complete: () => void;
  error: (data: { message: string }) => void;
  connect: () => void;
  disconnect: () => void;
}

// Voice types
export interface VoiceSettings {
  enabled: boolean;
  alwaysOn: boolean;
}

export interface AudioTranscription {
  success: boolean;
  text: string;
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// UI Component props
export interface MessageProps {
  message: ChatMessage;
  isLast?: boolean;
}

export interface ToolCallProps {
  toolCall: ToolCall;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ThreadInfo[];
  currentThreadId: string;
  onNewChat: () => void;
  onLoadThread: (threadId: string) => void;
}

export interface ThreadInfo {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  agentInfo: AgentInfo | null;
}