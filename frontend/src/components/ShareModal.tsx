import React, { useState, useEffect } from 'react';
import { X, Share, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThreadId: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentThreadId,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (isOpen && currentThreadId) {
      // Generate share URL with current thread ID
      const url = `${window.location.origin}/chat/${currentThreadId}`;
      setShareUrl(url);
    }
  }, [isOpen, currentThreadId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
            <Share className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-medium text-text">Share chat</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text hover:bg-background-secondary rounded-sm transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentThreadId ? (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  title="Share URL"
                  aria-label="Share URL"
                  className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-sm text-sm font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className={`px-4 py-2 border rounded-sm transition-colors flex items-center gap-2 ${
                    copied
                      ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
                      : 'bg-background border-border text-text-secondary hover:bg-background-secondary hover:text-text'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm font-medium">Copy</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="bg-background-secondary border border-border rounded-sm p-3">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Anyone with this URL can view your conversation. The link will remain active as long as the conversation exists.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">
                Start a conversation to generate a shareable link.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;