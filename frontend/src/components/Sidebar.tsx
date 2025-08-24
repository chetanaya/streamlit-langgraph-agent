import React from 'react';
import { 
  Plus, 
  Settings, 
  Share, 
  Download, 
  X, 
  MessageSquare,
  Layers
} from 'lucide-react';
import { SidebarProps } from '../types';

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  threads,
  currentThreadId,
  onNewChat,
  onLoadThread,
  onOpenSettings,
  onShareChat,
  onLoadChat,
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background-sidebar border-r border-border
        flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border min-h-[64px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-sm flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-text">AI Assistant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 text-text-secondary hover:text-text hover:bg-background-secondary rounded-sm transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-3 gap-2 overflow-y-auto">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-3 w-full px-4 py-3 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>

          {/* Chat History */}
          <div className="flex-1 mt-2">
            <div className="space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onLoadThread(thread.id)}
                  className={`
                    w-full text-left px-4 py-2.5 rounded-md transition-colors text-sm
                    ${thread.id === currentThreadId
                      ? 'bg-background-secondary text-text border border-border'
                      : 'text-text-secondary hover:bg-background-sidebar-secondary hover:text-text'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {truncateText(thread.title)}
                      </div>
                      {thread.lastMessage && (
                        <div className="text-xs text-text-muted mt-1 truncate">
                          {truncateText(thread.lastMessage, 40)}
                        </div>
                      )}
                      <div className="text-xs text-text-muted mt-1">
                        {formatDate(thread.timestamp)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-border pt-3 space-y-1">
            <button 
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-text-secondary hover:bg-background-sidebar-secondary hover:text-text rounded-md transition-colors text-sm"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            
            <button 
              type="button"
              onClick={onShareChat}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-text-secondary hover:bg-background-sidebar-secondary hover:text-text rounded-md transition-colors text-sm"
              aria-label="Share current chat"
            >
              <Share className="w-4 h-4" />
              <span>Share chat</span>
            </button>
            
            <button 
              type="button"
              onClick={onLoadChat}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-text-secondary hover:bg-background-sidebar-secondary hover:text-text rounded-md transition-colors text-sm"
              aria-label="Load existing chat"
            >
              <Download className="w-4 h-4" />
              <span>Load chat</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;