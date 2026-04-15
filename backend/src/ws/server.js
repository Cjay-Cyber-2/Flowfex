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
      pingTimeout: 30000,
      pingInterval: 10000,
      maxHttpBufferSize: 1e6,
    });

    this.orchestration = this.io.of('/orchestration');
    this.session = this.io.of('/session');
    this.control = this.io.of('/control');

    this._setupNamespaces();
    this._connectionCount = 0;
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
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.GRAPH_CREATED, graph);
  }

  /**
   * @param {string} sessionId
   * @param {import('./events.js').NodePayload} node
   */
  emitNodeCreated(sessionId, node) {
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
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_REJECTED, { sessionId, nodeId, ...data });
  }

  /**
   * @param {string} sessionId
   * @param {string} nodeId
   * @param {string} error
   */
  emitNodeError(sessionId, nodeId, error) {
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.NODE_ERROR, { sessionId, nodeId, error });
  }

  /**
   * @param {string} sessionId
   * @param {import('./events.js').EdgePayload} edge
   */
  emitEdgeCreated(sessionId, edge) {
    this.orchestration
      .to(`session:${sessionId}`)
      .emit(ORCHESTRATION_EVENTS.EDGE_CREATED, { sessionId, edge });
  }

  /**
   * @param {string} sessionId
   * @param {string} edgeId
   */
  emitEdgeActive(sessionId, edgeId) {
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
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.SESSION_PAUSED, { sessionId, state });
  }

  /**
   * @param {string} sessionId
   * @param {Object} [state]
   */
  emitSessionResumed(sessionId, state = {}) {
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.SESSION_RESUMED, { sessionId, state });
  }

  /**
   * @param {string} sessionId
   * @param {Object} [state]
   */
  emitSessionState(sessionId, state = {}) {
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
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.AGENT_CONNECTED, { sessionId, ...agent });
  }

  /**
   * @param {string} sessionId
   * @param {string} agentId
   */
  emitAgentDisconnected(sessionId, agentId) {
    this.session
      .to(`session:${sessionId}`)
      .emit(SESSION_EVENTS.AGENT_DISCONNECTED, { sessionId, agentId });
  }

  /**
   * @param {string} sessionId
   * @param {Object} [data]
   */
  emitSessionConstrained(sessionId, data = {}) {
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

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this._connectionCount,
    };
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
