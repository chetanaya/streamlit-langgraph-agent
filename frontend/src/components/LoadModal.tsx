import React, { useState } from 'react';
import { X, Download, MessageSquare } from 'lucide-react';

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadThread: (threadId: string) => void;
}

const LoadModal: React.FC<LoadModalProps> = ({
  isOpen,
  onClose,
  onLoadThread,
}) => {
  const [threadId, setThreadId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!threadId.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Load the thread
      await onLoadThread(threadId.trim());
      
      // Close modal and reset form
      setThreadId('');
      onClose();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setThreadId('');
      onClose();
    }
  };

  const extractThreadIdFromUrl = (input: string): string => {
    // If it's a full URL, extract the thread ID
    if (input.includes('/chat/')) {
      const match = input.match(/\/chat\/([^/?#]+)/);
      return match ? match[1] : input;
    }
    // Otherwise, assume it's already a thread ID
    return input;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setThreadId(value);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-background rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden animate-modal-slide-in shadow-heavy border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-medium text-text">Load conversation</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text hover:bg-background-secondary rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="thread-id-input" className="block text-sm font-medium text-text mb-2">
                Thread ID or Share URL
              </label>
              <input
                id="thread-id-input"
                type="text"
                value={threadId}
                onChange={handleInputChange}
                placeholder="Enter thread ID or paste share URL..."
                className="w-full px-3 py-3 bg-background border border-border rounded-sm text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-text-muted mt-2">
                You can paste either a thread ID or a full share URL
              </p>
            </div>

            <button
              type="submit"
              disabled={!threadId.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-sm font-medium transition-colors hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Load conversation</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 bg-background-secondary border border-border rounded-sm p-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              <strong className="text-text">Tip:</strong> You can also access conversations directly by visiting a share URL or by adding the thread ID to the current URL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadModal;