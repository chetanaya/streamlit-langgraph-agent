import { useEffect, useRef, useCallback } from 'react';
import { websocketService } from '../services/websocket';
import { ChatMessage } from '../types';

interface UseWebSocketOptions {
  onMessage?: (message: ChatMessage) => void;
  onStreamToken?: (token: string) => void;
  onMessageChunk?: (chunk: ChatMessage) => void;
  onStreamComplete?: () => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onStreamToken,
    onMessageChunk,
    onStreamComplete,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const cleanupFnsRef = useRef<(() => void)[]>([]);

  const connect = useCallback((url?: string) => {
    websocketService.connect(url);
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const sendMessage = useCallback((data: {
    message: string;
    model: string;
    thread_id: string;
    use_streaming: boolean;
    agent?: string;
  }) => {
    try {
      websocketService.sendMessage(data);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to send message');
    }
  }, [onError]);

  const isConnected = useCallback(() => {
    return websocketService.isConnected();
  }, []);

  useEffect(() => {
    // Set up event listeners
    const cleanupFns: (() => void)[] = [];

    if (onMessage) {
      const cleanup = websocketService.on('message_response', onMessage);
      cleanupFns.push(cleanup);
    }

    if (onStreamToken) {
      const cleanup = websocketService.on('stream_token', (data: { token: string }) => {
        onStreamToken(data.token);
      });
      cleanupFns.push(cleanup);
    }

    if (onMessageChunk) {
      const cleanup = websocketService.on('message_chunk', onMessageChunk);
      cleanupFns.push(cleanup);
    }

    if (onStreamComplete) {
      const cleanup = websocketService.on('stream_complete', onStreamComplete);
      cleanupFns.push(cleanup);
    }

    if (onError) {
      const cleanup = websocketService.on('error', (data: { message: string }) => {
        onError(data.message);
      });
      cleanupFns.push(cleanup);
    }

    if (onConnect) {
      const cleanup = websocketService.on('connect', onConnect);
      cleanupFns.push(cleanup);
    }

    if (onDisconnect) {
      const cleanup = websocketService.on('disconnect', onDisconnect);
      cleanupFns.push(cleanup);
    }

    cleanupFnsRef.current = cleanupFns;

    return () => {
      cleanupFns.forEach(cleanup => cleanup());
    };
  }, [onMessage, onStreamToken, onMessageChunk, onStreamComplete, onError, onConnect, onDisconnect]);

  useEffect(() => {
    // Auto-connect on mount
    connect();

    return () => {
      // Cleanup event listeners on unmount
      cleanupFnsRef.current.forEach(cleanup => cleanup());
    };
  }, [connect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected,
  };
};