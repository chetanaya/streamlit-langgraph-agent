import { io, Socket } from 'socket.io-client';
import { ChatMessage, SocketEvents } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(url: string = '') {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Set up base event listeners
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.emit('connect', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.emit('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', { message: `Connection error: ${error.message}` });
    });

    // Set up message event listeners
    this.socket.on('message_response', (data: ChatMessage) => {
      this.emit('message_response', data);
    });

    this.socket.on('stream_token', (data: { token: string }) => {
      this.emit('stream_token', data);
    });

    this.socket.on('message_chunk', (data: ChatMessage) => {
      this.emit('message_chunk', data);
    });

    this.socket.on('stream_complete', () => {
      this.emit('stream_complete', null);
    });

    this.socket.on('error', (data: { message: string }) => {
      this.emit('error', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  sendMessage(data: {
    message: string;
    model: string;
    thread_id: string;
    use_streaming: boolean;
    agent?: string;
  }) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    this.socket.emit('send_message', data);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Return cleanup function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();