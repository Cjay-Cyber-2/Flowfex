import { io } from 'socket.io-client';

/**
 * Flowfex WebSocket Client Singleton
 *
 * Connects to the backend Socket.io server on load.
 * Exposes typed event subscriptions per namespace.
 * Auto-reconnects with exponential backoff (1s → 30s max).
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const RECONNECT_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  reconnectionAttempts: Infinity,
  timeout: 10000,
};

class FlowfexSocketClient {
  constructor() {
    this._sockets = {};
    this._listeners = new Map();
    this._connected = false;
    this._sessionId = null;
  }

  /**
   * Connect to all three namespaces for a given session
   * @param {string} [sessionId]
   */
  connect(sessionId) {
    if (this._connected && this._sessionId === sessionId) return;
    this.disconnect();

    this._sessionId = sessionId || 'default';
    const query = { sessionId: this._sessionId };

    const namespaces = ['orchestration', 'session', 'control'];
    for (const ns of namespaces) {
      const socket = io(`${BACKEND_URL}/${ns}`, {
        ...RECONNECT_CONFIG,
        query,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log(`[Flowfex WS] /${ns} connected`);
      });

      socket.on('disconnect', (reason) => {
        console.log(`[Flowfex WS] /${ns} disconnected:`, reason);
      });

      socket.on('connect_error', (error) => {
        console.warn(`[Flowfex WS] /${ns} error:`, error.message);
      });

      this._sockets[ns] = socket;
    }

    this._connected = true;
  }

  /**
   * Disconnect all namespaces
   */
  disconnect() {
    for (const socket of Object.values(this._sockets)) {
      socket.disconnect();
    }
    this._sockets = {};
    this._listeners.clear();
    this._connected = false;
    this._sessionId = null;
  }

  /**
   * Subscribe to an event on a namespace
   * @param {string} namespace - 'orchestration' | 'session' | 'control'
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(namespace, event, callback) {
    const socket = this._sockets[namespace];
    if (!socket) {
      console.warn(`[Flowfex WS] No socket for namespace: ${namespace}`);
      return () => {};
    }

    socket.on(event, callback);
    const key = `${namespace}:${event}`;
    if (!this._listeners.has(key)) {
      this._listeners.set(key, []);
    }
    this._listeners.get(key).push({ socket, callback });

    return () => {
      socket.off(event, callback);
      const list = this._listeners.get(key) || [];
      this._listeners.set(
        key,
        list.filter((l) => l.callback !== callback)
      );
    };
  }

  /**
   * Emit an event on a namespace
   * @param {string} namespace
   * @param {string} event
   * @param {*} data
   */
  emit(namespace, event, data) {
    const socket = this._sockets[namespace];
    if (!socket) {
      console.warn(`[Flowfex WS] No socket for namespace: ${namespace}`);
      return;
    }
    socket.emit(event, data);
  }

  /**
   * Get connection status
   */
  get isConnected() {
    return this._connected;
  }

  get sessionId() {
    return this._sessionId;
  }
}

// Singleton instance
const socketClient = new FlowfexSocketClient();

export default socketClient;
