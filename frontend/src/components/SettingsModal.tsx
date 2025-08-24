import React from 'react';
import { X, Settings } from 'lucide-react';
import { SettingsModalProps } from '../types';

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  agentInfo,
}) => {
  if (!isOpen) return null;

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-background rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden animate-modal-slide-in shadow-heavy border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-medium text-text">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text hover:bg-background-secondary rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Model Selection */}
          <div>
            <label htmlFor="model-select" className="block text-sm font-medium text-text mb-2">
              Model
            </label>
            <select
              id="model-select"
              value={settings.model}
              onChange={(e) => handleSettingChange('model', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            >
              {agentInfo?.models ? (
                agentInfo.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option value={settings.model}>Loading models...</option>
              )}
            </select>
          </div>

          {/* Agent Selection */}
          <div>
            <label htmlFor="agent-select" className="block text-sm font-medium text-text mb-2">
              Agent
            </label>
            <select
              id="agent-select"
              value={settings.agent || ''}
              onChange={(e) => handleSettingChange('agent', e.target.value || null)}
              className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            >
              <option value="">Select an agent (optional)</option>
              {agentInfo?.agents.map((agent) => (
                <option key={agent.key} value={agent.key}>
                  {agent.key} - {agent.description}
                </option>
              ))}
            </select>
          </div>

          {/* Stream Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.stream}
                  onChange={(e) => handleSettingChange('stream', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  settings.stream ? 'bg-primary-500' : 'bg-border'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform transform ${
                    settings.stream ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-text">Stream responses</span>
              </div>
            </label>
          </div>

          {/* Voice Interaction Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.voiceEnabled}
                  onChange={(e) => handleSettingChange('voiceEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  settings.voiceEnabled ? 'bg-primary-500' : 'bg-border'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform transform ${
                    settings.voiceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-text">Voice interaction</span>
              </div>
            </label>
          </div>

          {/* Always-on Voice Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.alwaysOnVoice}
                  onChange={(e) => handleSettingChange('alwaysOnVoice', e.target.checked)}
                  disabled={!settings.voiceEnabled}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  settings.alwaysOnVoice && settings.voiceEnabled ? 'bg-primary-500' : 'bg-border'
                } ${!settings.voiceEnabled ? 'opacity-50' : ''}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform transform ${
                    settings.alwaysOnVoice && settings.voiceEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </div>
              <div className={!settings.voiceEnabled ? 'opacity-50' : ''}>
                <span className="text-sm font-medium text-text">Always-on voice detection</span>
                <p className="text-xs text-text-muted mt-1">
                  Automatically starts recording when you speak and stops after a pause. Microphone access required.
                </p>
              </div>
            </label>
          </div>

          {/* Privacy Notice */}
          <div className="bg-background-secondary border border-border rounded-sm p-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              Conversations are processed to provide responses and may be used to improve the service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;