import { Server } from 'socket.io';
import {
  ORCHESTRATION_EVENTS,
  SESSION_EVENTS,
  CONTROL_EVENTS,
} from './events.js';

/**
 * FlowfexSocketServer
 *
 * Manages the Socket.io server with three namespaces:
 * - /orchestration: graph execution events
 * - /session: connection and agent state events
 * - /control: user intervention events
 */
export class FlowfexSocketServer {
  /**
   * @param {import('http').Server} httpServer
   * @param {Object} [options]
   */
  constructor(httpServer, options = {}) {
    this.io = new Server(httpServer, {
      cors: {
        origin: options.corsOrigin || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 10000,
      pingInterval: 15000,
      maxHttpBufferSize: 5e5,
    });

    this.orchestration = this.io.of('/orchestration');
    this.session = this.io.of('/session');
    this.control = this.io.of('/control');

    this._setupNamespaces();
    this._connectionCount = 0;
    this._sessionListeners = new Map();
  }

  _setupNamespaces() {
    // ─── Orchestration namespace ───────────────────────────────────────
    this.orchestration.on('connection', (socket) => {
      this._connectionCount++;
      const sessionId = socket.handshake.query.sessionId;
      if (sessionId) {
        socket.join(`session:${sessionId}`);
      }
      socket.emit('room:joined', { sessionId });

      socket.on('disconnect', () => {
        this._connectionCount--;
      });
    });

    // ─── Session namespace ────────────────────────────────────────────
    this.session.on('connection', (socket) => {
      const sessionId = socket.handshake.query.sessionId;
      if (sessionId) {
        socket.join(`session:${sessionId}`);
      }
      socket.emit('room:joined', { sessionId });

      socket.on('disconnect', () => {
        // Could emit agent:disconnected here if needed
      });
    });

    // ─── Control namespace ────────────────────────────────────────────
    this.control.on('connection', (socket) => {
      const sessionId = socket.handshake.query.sessionId;
      if (sessionId) {
        socket.join(`session:${sessionId}`);
      }
      socket.emit('room:joined', { sessionId });
    });
  }

  // ─── Orchestration Emitters ───────────────────────────────────────────

  /**
   * Emit full graph data (all nodes and edges) to a session room
   * @param {string} sessionId
   * @param {import('./events.js').GraphPayload} graph
   */
  emitGraphCreated(sessionId, graph) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.GRAPH_CREATED,
      payload: graph,
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.GRAPH_CREATED, graph);
  }

  /**
   * @param {string} sessionId
   * @param {import('./events.js').NodePayload} node
   */
  emitNodeCreated(sessionId, node) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_CREATED,
      payload: { sessionId, node },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_CREATED, { sessionId, node });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {Object} [data]
   */
  emitNodeExecuting(sessionId, nodeId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_EXECUTING,
      payload: { sessionId, nodeId, ...data },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_EXECUTING, { sessionId, nodeId, ...data });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {Object} [data]
   */
  emitNodeCompleted(sessionId, nodeId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_COMPLETED,
      payload: { sessionId, nodeId, ...data },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_COMPLETED, { sessionId, nodeId, ...data });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {Object} [data]
   */
  emitNodeAwaitingApproval(sessionId, nodeId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_AWAITING_APPROVAL,
      payload: { sessionId, nodeId, ...data },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_AWAITING_APPROVAL, { sessionId, nodeId, ...data });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {Object} [data]
   */
  emitNodeApproved(sessionId, nodeId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_APPROVED,
      payload: { sessionId, nodeId, ...data },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_APPROVED, { sessionId, nodeId, ...data });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {Object} [data]
   */
  emitNodeRejected(sessionId, nodeId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_REJECTED,
      payload: { sessionId, nodeId, ...data },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_REJECTED, { sessionId, nodeId, ...data });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {Object|string} error
   */
  emitNodeError(sessionId, nodeId, error) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.NODE_ERROR,
      payload: { sessionId, nodeId, error },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_ERROR, { sessionId, nodeId, error });
  }

  /**
   * @param {string} sessionId
   * @param {import('./events.js').EdgePayload} edge
   */
  emitEdgeCreated(sessionId, edge) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.EDGE_CREATED,
      payload: { sessionId, edge },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.EDGE_CREATED, { sessionId, edge });
  }

  /**
   * @param {string} sessionId
   * @param {string} edgeId
   */
  emitEdgeActive(sessionId, edgeId) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.EDGE_ACTIVE,
      payload: { sessionId, edgeId },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.EDGE_ACTIVE, { sessionId, edgeId });
  }

  /**
   * @param {string} sessionId
   * @param {string} edgeId
   * @param {Object} [data]
   */
  emitPathRerouted(sessionId, edgeId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'orchestration',
      type: ORCHESTRATION_EVENTS.PATH_REROUTED,
      payload: { sessionId, edgeId, ...data },
    });
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.PATH_REROUTED, { sessionId, edgeId, ...data });
  }

  // ─── Session Emitters ─────────────────────────────────────────────────

  /**
   * @param {string} sessionId
   * @param {Object} [state]
   */
  emitSessionPaused(sessionId, state = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'session',
      type: SESSION_EVENTS.SESSION_PAUSED,
      payload: { sessionId, state },
    });
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.SESSION_PAUSED, { sessionId, state });
  }

  /**
   * @param {string} sessionId
   * @param {Object} [state]
   */
  emitSessionResumed(sessionId, state = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'session',
      type: SESSION_EVENTS.SESSION_RESUMED,
      payload: { sessionId, state },
    });
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.SESSION_RESUMED, { sessionId, state });
  }

  /**
   * @param {string} sessionId
   * @param {Object} [state]
   */
  emitSessionState(sessionId, state = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'session',
      type: SESSION_EVENTS.SESSION_STATE,
      payload: state,
    });
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.SESSION_STATE, state);
    this.control
      .to(`session:${sessionId}`)
      .emit(CONTROL_EVENTS.SESSION_STATE, state);
  }

  /**
   * @param {string} sessionId
   * @param {import('./events.js').AgentPayload} agent
   */
  emitAgentConnected(sessionId, agent) {
    this._notifySessionListeners(sessionId, {
      namespace: 'session',
      type: SESSION_EVENTS.AGENT_CONNECTED,
      payload: { sessionId, ...agent },
    });
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.AGENT_CONNECTED, { sessionId, ...agent });
  }

  /**
   * @param {string} sessionId
   * @param {string} agentId
   */
  emitAgentDisconnected(sessionId, agentId) {
    this._notifySessionListeners(sessionId, {
      namespace: 'session',
      type: SESSION_EVENTS.AGENT_DISCONNECTED,
      payload: { sessionId, agentId },
    });
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.AGENT_DISCONNECTED, { sessionId, agentId });
  }

  /**
   * @param {string} sessionId
   * @param {Object} [data]
   */
  emitSessionConstrained(sessionId, data = {}) {
    this._notifySessionListeners(sessionId, {
      namespace: 'control',
      type: CONTROL_EVENTS.SESSION_CONSTRAINED,
      payload: { sessionId, ...data },
    });
    this.control
      .to(`session:${sessionId}`)
      .emit(CONTROL_EVENTS.SESSION_CONSTRAINED, { sessionId, ...data });
  }

  /**
   * @param {string|null} sessionId
   * @param {Object} error
   */
  emitControlError(sessionId, error) {
    if (sessionId) {
      this._notifySessionListeners(sessionId, {
        namespace: 'control',
        type: CONTROL_EVENTS.CONTROL_ERROR,
        payload: error,
      });
      this.control
        .to(`session:${sessionId}`)
        .emit(CONTROL_EVENTS.CONTROL_ERROR, error);
      this.session
        .to(`session:${sessionId}`)
        .emit(CONTROL_EVENTS.CONTROL_ERROR, error);
      return;
    }

    this.control.emit(CONTROL_EVENTS.CONTROL_ERROR, error);
  }

  // ─── Broadcast (all connected clients) ─────────────────────────────

  /**
   * Broadcast to all clients in a session across all namespaces
   */
  broadcastToSession(sessionId, event, data) {
    this.orchestration.to(`session:${sessionId}`).emit(event, data);
    this.session.to(`session:${sessionId}`).emit(event, data);
    this.control.to(`session:${sessionId}`).emit(event, data);
  }

  registerSessionListener(sessionId, listener) {
    if (!this._sessionListeners.has(sessionId)) {
      this._sessionListeners.set(sessionId, new Set());
    }
    this._sessionListeners.get(sessionId).add(listener);
  }

  unregisterSessionListener(sessionId, listener) {
    const listeners = this._sessionListeners.get(sessionId);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size === 0) {
      this._sessionListeners.delete(sessionId);
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this._connectionCount,
    };
  }

  _notifySessionListeners(sessionId, event) {
    const listeners = this._sessionListeners.get(sessionId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      try {
        listener({
          sessionId,
          ...event,
        });
      } catch {
        // Streaming listeners are best-effort and must not break socket delivery.
      }
    }
  }
}

/** @type {FlowfexSocketServer|null} */
let defaultSocketServer = null;

/**
 * Initialize the global Socket.io server
 * @param {import('http').Server} httpServer
 * @param {Object} [options]
 * @returns {FlowfexSocketServer}
 */
export function initSocketServer(httpServer, options = {}) {
  if (defaultSocketServer) {
    return defaultSocketServer;
  }
  defaultSocketServer = new FlowfexSocketServer(httpServer, options);
  return defaultSocketServer;
}

/**
 * Get the global Socket.io server instance
 * @returns {FlowfexSocketServer|null}
 */
export function getSocketServer() {
  return defaultSocketServer;
}

/**
 * Reset the singleton for testing purposes
 */
export function resetSocketServer() {
  defaultSocketServer = null;
}
