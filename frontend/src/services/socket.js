import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket) {
      return this.socket;
    }

    console.log('Connecting to socket server:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Reality Check server, Socket ID:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server. Reason:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
      this.connected = false;
    });

    // Re-register any existing listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.listeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      console.log(`📤 Emitting event: ${event}`, data);
      this.socket.emit(event, data);
      return true;
    } else {
      console.warn(`❌ Cannot emit ${event}: socket not connected`);
      return false;
    }
  }

  askQuestion(question, conversationId, userId = 'anonymous') {
    console.log('📨 Asking question:', { question, conversationId, userId });
    return this.emit('ask-question', {
      question,
      conversationId,
      userId
    });
  }

  isConnected() {
    return this.connected;
  }
}

export default new SocketService();