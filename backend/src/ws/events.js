/**
 * Shared WebSocket Event Types for Flowfex
 * 
 * These event names and payload shapes are used by both the backend Socket.io server
 * and the frontend Socket.io client to ensure a consistent event contract.
 */

// ─── Orchestration Namespace Events ───────────────────────────────────────────

export const ORCHESTRATION_EVENTS = {
  NODE_CREATED: 'node:created',
  NODE_EXECUTING: 'node:executing',
  NODE_COMPLETED: 'node:completed',
  NODE_AWAITING_APPROVAL: 'node:awaiting_approval',
  NODE_APPROVED: 'node:approved',
  NODE_REJECTED: 'node:rejected',
  NODE_ERROR: 'node:error',
  EDGE_CREATED: 'edge:created',
  EDGE_ACTIVE: 'edge:active',
  PATH_REROUTED: 'path:rerouted',
  GRAPH_CREATED: 'graph:created',
};

// ─── Session Namespace Events ─────────────────────────────────────────────────

export const SESSION_EVENTS = {
  SESSION_CREATED: 'session:created',
  SESSION_PAUSED: 'session:paused',
  SESSION_RESUMED: 'session:resumed',
  AGENT_CONNECTED: 'agent:connected',
  AGENT_DISCONNECTED: 'agent:disconnected',
};

// ─── Control Namespace Events ─────────────────────────────────────────────────

export const CONTROL_EVENTS = {
  SESSION_CONSTRAINED: 'session:constrained',
};

// ─── Payload Shapes (JSDoc for type safety in plain JS) ───────────────────────

/**
 * @typedef {Object} NodePayload
 * @property {string} id
 * @property {string} type
 * @property {string} shape
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} title
 * @property {string} subtitle
 * @property {string} state
 * @property {string} icon
 * @property {number} [confidence]
 * @property {string} [reasoning]
 * @property {Object} [inputs]
 * @property {Object} [config]
 * @property {string} [owner]
 * @property {Array} [alternatives]
 * @property {Array} [risks]
 */

/**
 * @typedef {Object} EdgePayload
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {string} state
 * @property {string} [label]
 */

/**
 * @typedef {Object} GraphPayload
 * @property {string} sessionId
 * @property {string} executionId
 * @property {NodePayload[]} nodes
 * @property {EdgePayload[]} edges
 */

/**
 * @typedef {Object} NodeEventPayload
 * @property {string} sessionId
 * @property {string} nodeId
 * @property {string} [state]
 * @property {Object} [data]
 * @property {string} [error]
 */

/**
 * @typedef {Object} EdgeEventPayload
 * @property {string} sessionId
 * @property {string} edgeId
 * @property {string} [state]
 * @property {string} [from]
 * @property {string} [to]
 */

/**
 * @typedef {Object} AgentPayload
 * @property {string} sessionId
 * @property {string} agentId
 * @property {string} agentName
 * @property {string} connectionType
 * @property {string} status
 */

/**
 * @typedef {Object} SessionPayload
 * @property {string} sessionId
 * @property {string} [executionId]
 * @property {Object} [state]
 */
