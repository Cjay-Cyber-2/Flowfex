import { createHash, randomUUID } from 'node:crypto';
import {
  CONTROL_ACTIONS,
  CONTROL_EVENTS,
  approveNodeEventSchema,
  approveNodeRequestSchema,
  constrainSessionEventSchema,
  constrainSessionRequestSchema,
  controlActionResponseSchema,
  pauseSessionEventSchema,
  pauseSessionRequestSchema,
  rejectNodeEventSchema,
  rejectNodeRequestSchema,
  rerouteNodeEventSchema,
  rerouteNodeRequestSchema,
  resumeSessionEventSchema,
  resumeSessionRequestSchema,
  sessionStateEventSchema,
} from '../../../shared/control-contracts.js';
import { defaultSessionLockManager } from './SessionLockManager.js';
import { createControlError, toControlError } from './errors.js';
import { defaultSessionStateRepository } from '../persistence/defaultSessionStateRepository.js';

const FALLBACK_NODE_PATTERN = /\b(manual|review|fallback|reject|alternate|rerout|human)\b/i;

export class ControlService {
  constructor(config = {}) {
    if (!config.orchestrator) {
      throw new Error('ControlService requires an orchestrator');
    }

    this.orchestrator = config.orchestrator;
    this.socketServer = config.socketServer || null;
    this.lockManager = config.lockManager || defaultSessionLockManager;
    this.sessionStateRepository = config.sessionStateRepository || defaultSessionStateRepository;
    this.activeContinuations = new Map();
  }

  setSocketServer(socketServer) {
    this.socketServer = socketServer;
  }

  async getSessionState(sessionId) {
    return this._requireSnapshot(sessionId);
  }

  async pauseSession(sessionId, payload = {}) {
    const request = pauseSessionRequestSchema.parse(payload);

    return this.lockManager.runExclusive(sessionId, async () => {
      const snapshot = await this._requireSnapshot(sessionId);
      this._assertExpectedRevision(snapshot, request.expectedRevision);

      if (snapshot.status === 'completed' || snapshot.status === 'failed') {
        throw createControlError('Completed sessions cannot be paused', {
          code: 'invalid_session_state',
          statusCode: 409,
        });
      }

      if (snapshot.status === 'paused' || snapshot.control.pauseRequestedAt) {
        throw createControlError('Pause has already been requested for this session', {
          code: 'pause_already_requested',
          statusCode: 409,
        });
      }

      const stateStore = this.orchestrator.getStateStore();
      const now = new Date().toISOString();

      if (snapshot.status === 'running') {
        stateStore.setControl(sessionId, {
          pauseRequestedAt: now,
          pauseReason: request.reason || null,
          lastAction: CONTROL_ACTIONS.PAUSE,
          lastActionAt: now,
        });
        const nextSnapshot = this.orchestrator.getSessionState(sessionId);
        this._emitSessionState(nextSnapshot);
        await this._flushStateStore();

        return this._buildResponse(CONTROL_ACTIONS.PAUSE, nextSnapshot, {
          name: CONTROL_EVENTS.SESSION_STATE,
          payload: sessionStateEventSchema.parse({
            sessionId: nextSnapshot.sessionId,
            revision: nextSnapshot.revision,
            snapshot: nextSnapshot,
          }),
        });
      }

      stateStore.setStatus(sessionId, 'paused');
      stateStore.setControl(sessionId, {
        pauseRequestedAt: null,
        pauseReason: request.reason || null,
        pausedAt: now,
        lastAction: CONTROL_ACTIONS.PAUSE,
        lastActionAt: now,
      });
      const nextSnapshot = this.orchestrator.getSessionState(sessionId);
      const eventPayload = pauseSessionEventSchema.parse({
        action: CONTROL_ACTIONS.PAUSE,
        sessionId: nextSnapshot.sessionId,
        revision: nextSnapshot.revision,
        status: 'paused',
        pausedAt: now,
        reason: request.reason || null,
        pendingNodeId: nextSnapshot.pendingNodeId,
      });

      this.socketServer?.emitSessionPaused?.(sessionId, eventPayload);
      this._emitSessionState(nextSnapshot);
      await this._flushStateStore();

      return this._buildResponse(CONTROL_ACTIONS.PAUSE, nextSnapshot, {
        name: CONTROL_EVENTS.SESSION_PAUSED,
        payload: eventPayload,
      });
    });
  }

  async resumeSession(sessionId, payload = {}) {
    const request = resumeSessionRequestSchema.parse(payload);

    return this.lockManager.runExclusive(sessionId, async () => {
      const snapshot = await this._requireSnapshot(sessionId);
      this._assertExpectedRevision(snapshot, request.expectedRevision);

      if (snapshot.status !== 'paused') {
        throw createControlError('Only paused sessions can be resumed', {
          code: 'invalid_session_state',
          statusCode: 409,
        });
      }

      const approvalNode = snapshot.currentNodeId
        ? this._findNode(snapshot, snapshot.currentNodeId)
        : null;
      if (approvalNode?.state === 'approval') {
        throw createControlError('Awaiting approval sessions must be approved or rejected before resume', {
          code: 'approval_required',
          statusCode: 409,
        });
      }

      this._assertNoContinuation(sessionId);

      const now = new Date().toISOString();
      const stateStore = this.orchestrator.getStateStore();
      stateStore.setStatus(sessionId, 'running');
      stateStore.setControl(sessionId, {
        pauseRequestedAt: null,
        pauseReason: null,
        resumedAt: now,
        lastAction: CONTROL_ACTIONS.RESUME,
        lastActionAt: now,
      });

      const nextSnapshot = this.orchestrator.getSessionState(sessionId);
      const eventPayload = resumeSessionEventSchema.parse({
        action: CONTROL_ACTIONS.RESUME,
        sessionId: nextSnapshot.sessionId,
        revision: nextSnapshot.revision,
        status: 'running',
        resumedAt: now,
        pendingNodeId: nextSnapshot.pendingNodeId,
      });

      this.socketServer?.emitSessionResumed?.(sessionId, eventPayload);
      this._emitSessionState(nextSnapshot);
      await this._flushStateStore();
      this._scheduleContinuation(sessionId, CONTROL_ACTIONS.RESUME);

      return this._buildResponse(CONTROL_ACTIONS.RESUME, nextSnapshot, {
        name: CONTROL_EVENTS.SESSION_RESUMED,
        payload: eventPayload,
      });
    });
  }

  async approveNode(nodeId, payload = {}) {
    const request = approveNodeRequestSchema.parse(payload);

    return this.lockManager.runExclusive(request.sessionId, async () => {
      const snapshot = await this._requireSnapshot(request.sessionId);
      this._assertExpectedRevision(snapshot, request.expectedRevision);
      const node = this._findNode(snapshot, nodeId);

      if (node.state !== 'approval') {
        throw createControlError('Only nodes awaiting approval can be approved', {
          code: 'invalid_node_state',
          statusCode: 409,
          details: { nodeId, state: node.state },
        });
      }

      const stateStore = this.orchestrator.getStateStore();
      const now = new Date().toISOString();
      const nextNodeId = snapshot.pendingNodeId;
      stateStore.updateNodeState(request.sessionId, nodeId, 'completed');
      stateStore.setCurrentNode(request.sessionId, null);
      stateStore.markPendingNode(request.sessionId, nextNodeId);
      stateStore.setControl(request.sessionId, {
        lastAction: CONTROL_ACTIONS.APPROVE,
        lastActionAt: now,
      });

      const nextStatus = snapshot.status === 'paused' ? 'paused' : 'running';
      stateStore.setStatus(request.sessionId, nextStatus);
      const nextSnapshot = this.orchestrator.getSessionState(request.sessionId);
      const eventPayload = approveNodeEventSchema.parse({
        action: CONTROL_ACTIONS.APPROVE,
        sessionId: nextSnapshot.sessionId,
        nodeId,
        revision: nextSnapshot.revision,
        approvedAt: now,
        nextNodeId,
        note: request.note || null,
      });

      this.socketServer?.emitNodeApproved?.(request.sessionId, nodeId, eventPayload);
      this.socketServer?.emitNodeCompleted?.(request.sessionId, nodeId, {
        approvedAt: now,
        note: request.note || null,
      });
      this._emitSessionState(nextSnapshot);
      await this._flushStateStore();

      if (nextStatus === 'running') {
        this._assertNoContinuation(request.sessionId);
        this._scheduleContinuation(request.sessionId, CONTROL_ACTIONS.APPROVE);
      }

      return this._buildResponse(CONTROL_ACTIONS.APPROVE, nextSnapshot, {
        name: CONTROL_EVENTS.NODE_APPROVED,
        payload: eventPayload,
      });
    });
  }

  async rejectNode(nodeId, payload = {}) {
    const request = rejectNodeRequestSchema.parse(payload);

    return this.lockManager.runExclusive(request.sessionId, async () => {
      const snapshot = await this._requireSnapshot(request.sessionId);
      this._assertExpectedRevision(snapshot, request.expectedRevision);
      const node = this._findNode(snapshot, nodeId);

      if (node.state !== 'approval') {
        throw createControlError('Only nodes awaiting approval can be rejected', {
          code: 'invalid_node_state',
          statusCode: 409,
          details: { nodeId, state: node.state },
        });
      }

      const targetNode = request.fallbackNodeId
        ? this._findNode(snapshot, request.fallbackNodeId)
        : this._findFallbackNode(snapshot, nodeId);
      if (!targetNode) {
        throw createControlError('No fallback node is available for this rejection', {
          code: 'fallback_not_found',
          statusCode: 409,
          details: { nodeId },
        });
      }

      const stateStore = this.orchestrator.getStateStore();
      const now = new Date().toISOString();
      stateStore.updateNodeState(request.sessionId, nodeId, 'skipped');
      const hadRerouteEdge = snapshot.graph.edges.some((edge) => edge.from === nodeId && edge.to === targetNode.id);
      const rerouteEdge = this._ensureRerouteEdge(snapshot, nodeId, targetNode.id);
      stateStore.replaceGraph(request.sessionId, snapshot.graph);
      stateStore.appendGraphUpdate(request.sessionId, {
        id: `graph_update_${randomUUID()}`,
        type: 'reroute_edge_added',
        nodeId,
        edgeId: rerouteEdge.id,
        payload: {
          from: nodeId,
          to: targetNode.id,
          reason: request.reason || 'node_rejected',
        },
        createdAt: now,
      });
      stateStore.setCurrentNode(request.sessionId, null);
      stateStore.markPendingNode(request.sessionId, targetNode.id);
      stateStore.setControl(request.sessionId, {
        lastAction: CONTROL_ACTIONS.REJECT,
        lastActionAt: now,
      });

      const nextStatus = snapshot.status === 'paused' ? 'paused' : 'running';
      stateStore.setStatus(request.sessionId, nextStatus);
      const nextSnapshot = this.orchestrator.getSessionState(request.sessionId);
      const eventPayload = rejectNodeEventSchema.parse({
        action: CONTROL_ACTIONS.REJECT,
        sessionId: nextSnapshot.sessionId,
        nodeId,
        revision: nextSnapshot.revision,
        rejectedAt: now,
        reason: request.reason || null,
        targetNodeId: targetNode.id,
      });

      if (!hadRerouteEdge) {
        this.socketServer?.emitEdgeCreated?.(request.sessionId, rerouteEdge);
      }
      this.socketServer?.emitNodeRejected(request.sessionId, nodeId, eventPayload);
      this.socketServer?.emitPathRerouted(request.sessionId, rerouteEdge.id, {
        from: nodeId,
        to: targetNode.id,
        reason: request.reason || 'node_rejected',
      });
      this._emitSessionState(nextSnapshot);
      await this._flushStateStore();

      if (nextStatus === 'running') {
        this._assertNoContinuation(request.sessionId);
        this._scheduleContinuation(request.sessionId, CONTROL_ACTIONS.REJECT);
      }

      return this._buildResponse(CONTROL_ACTIONS.REJECT, nextSnapshot, {
        name: CONTROL_EVENTS.NODE_REJECTED,
        payload: eventPayload,
      });
    });
  }

  async rerouteNode(nodeId, payload = {}) {
    const request = rerouteNodeRequestSchema.parse(payload);

    return this.lockManager.runExclusive(request.sessionId, async () => {
      const snapshot = await this._requireSnapshot(request.sessionId);
      this._assertExpectedRevision(snapshot, request.expectedRevision);
      const sourceNode = this._findNode(snapshot, nodeId);
      const targetNode = this._findNode(snapshot, request.targetNodeId);

      if (targetNode.state === 'completed') {
        throw createControlError('Cannot reroute to a completed node', {
          code: 'invalid_reroute_target',
          statusCode: 409,
          details: { targetNodeId: targetNode.id, state: targetNode.state },
        });
      }

      const stateStore = this.orchestrator.getStateStore();
      const now = new Date().toISOString();
      if (sourceNode.state === 'approval' || sourceNode.state === 'completed') {
        stateStore.updateNodeState(request.sessionId, nodeId, 'completed');
      } else {
        stateStore.updateNodeState(request.sessionId, nodeId, 'skipped');
      }

      const hadRerouteEdge = snapshot.graph.edges.some((edge) => edge.from === nodeId && edge.to === targetNode.id);
      const rerouteEdge = this._ensureRerouteEdge(snapshot, nodeId, targetNode.id);
      stateStore.replaceGraph(request.sessionId, snapshot.graph);
      stateStore.appendGraphUpdate(request.sessionId, {
        id: `graph_update_${randomUUID()}`,
        type: 'reroute_edge_added',
        nodeId,
        edgeId: rerouteEdge.id,
        payload: {
          from: nodeId,
          to: targetNode.id,
          reason: request.reason || 'manual_reroute',
        },
        createdAt: now,
      });
      stateStore.setCurrentNode(request.sessionId, null);
      stateStore.markPendingNode(request.sessionId, targetNode.id);
      stateStore.setControl(request.sessionId, {
        lastAction: CONTROL_ACTIONS.REROUTE,
        lastActionAt: now,
      });

      const nextStatus = snapshot.status === 'paused' ? 'paused' : 'running';
      stateStore.setStatus(request.sessionId, nextStatus);
      const nextSnapshot = this.orchestrator.getSessionState(request.sessionId);
      const eventPayload = rerouteNodeEventSchema.parse({
        action: CONTROL_ACTIONS.REROUTE,
        sessionId: nextSnapshot.sessionId,
        nodeId,
        targetNodeId: targetNode.id,
        edgeId: rerouteEdge.id,
        revision: nextSnapshot.revision,
        reroutedAt: now,
        reason: request.reason || null,
      });

      if (!hadRerouteEdge) {
        this.socketServer?.emitEdgeCreated?.(request.sessionId, rerouteEdge);
      }
      this.socketServer?.emitPathRerouted(request.sessionId, rerouteEdge.id, {
        from: nodeId,
        to: targetNode.id,
        reason: request.reason || 'manual_reroute',
      });
      this._emitSessionState(nextSnapshot);
      await this._flushStateStore();

      if (nextStatus === 'running') {
        this._assertNoContinuation(request.sessionId);
        this._scheduleContinuation(request.sessionId, CONTROL_ACTIONS.REROUTE);
      }

      return this._buildResponse(CONTROL_ACTIONS.REROUTE, nextSnapshot, {
        name: CONTROL_EVENTS.PATH_REROUTED,
        payload: eventPayload,
      });
    });
  }

  async constrainSession(sessionId, payload = {}) {
    const request = constrainSessionRequestSchema.parse(payload);

    return this.lockManager.runExclusive(sessionId, async () => {
      const snapshot = await this._requireSnapshot(sessionId);
      this._assertExpectedRevision(snapshot, request.expectedRevision);

      if (snapshot.status === 'running') {
        throw createControlError('Running sessions must be paused before constraints can be changed', {
          code: 'session_busy',
          statusCode: 409,
        });
      }

      if (snapshot.status === 'completed' || snapshot.status === 'failed') {
        throw createControlError('Completed sessions cannot be constrained', {
          code: 'invalid_session_state',
          statusCode: 409,
        });
      }

      const { selection, updatedNodeIds } = this._applyConstraints(snapshot, request.blockedSkillIds);
      const buildResult = this.orchestrator.rebuildExecutionGraph({
        sessionId: snapshot.sessionId,
        executionId: snapshot.executionId,
        selection,
      });
      buildResult.graph = this._mergeGraphState(snapshot.graph, buildResult.graph, updatedNodeIds);

      const stateStore = this.orchestrator.getStateStore();
      const now = new Date().toISOString();
      stateStore.setBlockedSkillIds(sessionId, request.blockedSkillIds);
      stateStore.replaceSelection(sessionId, selection);
      stateStore.replaceGraph(sessionId, buildResult.graph);
      stateStore.appendGraphUpdate(sessionId, {
        id: `graph_update_${randomUUID()}`,
        type: 'selection_constrained',
        payload: {
          blockedSkillIds: request.blockedSkillIds,
          updatedNodeIds,
          reason: request.reason || null,
        },
        createdAt: now,
      });
      stateStore.setControl(sessionId, {
        lastAction: CONTROL_ACTIONS.CONSTRAIN,
        lastActionAt: now,
      });

      const nextSnapshot = this.orchestrator.getSessionState(sessionId);
      const eventPayload = constrainSessionEventSchema.parse({
        action: CONTROL_ACTIONS.CONSTRAIN,
        sessionId: nextSnapshot.sessionId,
        revision: nextSnapshot.revision,
        blockedSkillIds: nextSnapshot.blockedSkillIds,
        updatedNodeIds,
        constrainedAt: now,
        reason: request.reason || null,
      });

      this.socketServer?.emitGraphCreated?.(sessionId, nextSnapshot.graph);
      this.socketServer?.emitSessionConstrained?.(sessionId, eventPayload);
      this._emitSessionState(nextSnapshot);
      await this._flushStateStore();

      return this._buildResponse(CONTROL_ACTIONS.CONSTRAIN, nextSnapshot, {
        name: CONTROL_EVENTS.SESSION_CONSTRAINED,
        payload: eventPayload,
      });
    });
  }

  async _requireSnapshot(sessionId) {
    let snapshot = this.orchestrator.getSessionState(sessionId);
    if (snapshot) {
      return snapshot;
    }

    snapshot = await this.sessionStateRepository.read(sessionId);
    if (snapshot) {
      return this.orchestrator.hydrateSessionState(snapshot);
    }

    throw createControlError(`Session '${sessionId}' was not found`, {
      code: 'session_not_found',
      statusCode: 404,
    });
  }

  _buildResponse(action, snapshot, event) {
    return controlActionResponseSchema.parse({
      ok: true,
      action,
      sessionId: snapshot.sessionId,
      snapshot,
      event,
    });
  }

  _assertExpectedRevision(snapshot, expectedRevision) {
    if (typeof expectedRevision !== 'number') {
      return;
    }

    if (snapshot.revision !== expectedRevision) {
      throw createControlError('The session has changed since the client last synced', {
        code: 'stale_revision',
        statusCode: 409,
        details: {
          expectedRevision,
          actualRevision: snapshot.revision,
        },
      });
    }
  }

  _assertNoContinuation(sessionId) {
    if (this.activeContinuations.has(sessionId)) {
      throw createControlError('A continuation is already running for this session', {
        code: 'session_busy',
        statusCode: 409,
      });
    }
  }

  _scheduleContinuation(sessionId, actionType) {
    const continuation = this.orchestrator
      .continueSession(sessionId, {
        socketServer: this.socketServer,
      })
      .catch((error) => {
        const controlError = toControlError(error, {
          code: 'continuation_failed',
          statusCode: 500,
        });
        this._emitControlError(actionType, controlError, { sessionId });
      })
      .finally(() => {
        this.activeContinuations.delete(sessionId);
      });

    this.activeContinuations.set(sessionId, continuation);
    return continuation;
  }

  _emitSessionState(snapshot) {
    if (!snapshot) {
      return;
    }

    const payload = sessionStateEventSchema.parse({
      sessionId: snapshot.sessionId,
      revision: snapshot.revision,
      snapshot,
    });
    this.socketServer?.emitSessionState?.(snapshot.sessionId, payload);
  }

  _emitControlError(actionType, error, context = {}) {
    const payload = {
      action: CONTROL_ACTIONS.ERROR,
      actionType,
      sessionId: context.sessionId || null,
      nodeId: context.nodeId || null,
      statusCode: error.statusCode || 500,
      code: error.code || 'control_error',
      message: error.message,
      retryable: error.retryable === true,
      occurredAt: new Date().toISOString(),
    };
    this.socketServer?.emitControlError?.(context.sessionId || null, payload);
  }

  async _flushStateStore() {
    await this.orchestrator.getStateStore().flushPersistence?.();
  }

  _findNode(snapshot, nodeId) {
    const node = snapshot.graph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      throw createControlError(`Node '${nodeId}' was not found in session '${snapshot.sessionId}'`, {
        code: 'node_not_found',
        statusCode: 404,
      });
    }
    return node;
  }

  _findFallbackNode(snapshot, nodeId) {
    const currentIndex = snapshot.graph.nodes.findIndex((node) => node.id === nodeId);
    const tailNodes = currentIndex >= 0
      ? snapshot.graph.nodes.slice(currentIndex + 1)
      : snapshot.graph.nodes;

    const preferredTailFallback = tailNodes.find((node) =>
      node.state !== 'completed'
      && node.state !== 'skipped'
      && FALLBACK_NODE_PATTERN.test(`${node.title} ${node.subtitle} ${node.reasoning}`)
    );
    if (preferredTailFallback) {
      return preferredTailFallback;
    }

    const fallbackEdge = snapshot.graph.edges.find((edge) => {
      if (
        edge.from !== nodeId
        || edge.to === nodeId
        || edge.state === 'completed'
        || edge.state === 'inactive'
      ) {
        return false;
      }

      const targetNode = snapshot.graph.nodes.find((node) => node.id === edge.to);
      return Boolean(
        targetNode
        && targetNode.state !== 'completed'
        && targetNode.state !== 'skipped'
        && FALLBACK_NODE_PATTERN.test(`${targetNode.title} ${targetNode.subtitle} ${targetNode.reasoning}`)
      );
    });
    if (fallbackEdge) {
      return snapshot.graph.nodes.find((node) => node.id === fallbackEdge.to) || null;
    }

    const outgoingEdge = snapshot.graph.edges.find((edge) =>
      edge.from === nodeId
      && edge.to !== nodeId
      && edge.state !== 'completed'
      && edge.state !== 'inactive'
    );
    if (outgoingEdge) {
      return snapshot.graph.nodes.find((node) => node.id === outgoingEdge.to) || null;
    }

    return null;
  }

  _ensureRerouteEdge(snapshot, fromNodeId, toNodeId) {
    const existing = snapshot.graph.edges.find((edge) => edge.from === fromNodeId && edge.to === toNodeId);
    if (existing) {
      existing.state = 'rerouted';
      return existing;
    }

    const edge = {
      id: stableId('edge', fromNodeId, toNodeId, 'reroute'),
      from: fromNodeId,
      to: toNodeId,
      state: 'rerouted',
      label: 'reroute',
      type: 'conditional',
    };
    snapshot.graph.edges.push(edge);
    return edge;
  }

  _applyConstraints(snapshot, blockedSkillIds) {
    const blocked = new Set(blockedSkillIds);
    const updatedNodeIds = [];
    const nextRankings = snapshot.selection.rankings.map((ranking) => ({ ...ranking }));
    const nextSteps = snapshot.selection.selectedSteps.map((step) => {
      const nodeId = stableId('node', step.stepId);
      const completed = snapshot.completedNodeIds.includes(nodeId);
      if (completed || !blocked.has(step.toolId)) {
        return step;
      }

      const ranking = nextRankings.find((candidate) => candidate.stepId === step.stepId);
      const alternatives = ranking?.candidates || [];
      const replacement = alternatives.find((candidate) =>
        !blocked.has(candidate.toolId) && this.orchestrator.registry.getTool(candidate.toolId)
      );

      if (!replacement) {
        const byCategory = this.orchestrator.registry.getAllTools().find((tool) =>
          !blocked.has(tool.id) && (tool.metadata?.category || 'uncategorized') === step.capabilityCategory
        );
        if (!byCategory) {
          throw createControlError(`No available replacement tool for step '${step.title}'`, {
            code: 'constraint_conflict',
            statusCode: 409,
            details: {
              stepId: step.stepId,
              blockedSkillIds: [...blocked],
            },
          });
        }

        if (ranking) {
          ranking.selectedToolId = byCategory.id;
        }

        updatedNodeIds.push(nodeId);
        return {
          ...step,
          toolId: byCategory.id,
          tool: cloneToolForSelection(byCategory),
          reasoning: `${step.reasoning} Constrained away from blocked skill '${step.toolId}'.`,
        };
      }

      const replacementTool = this.orchestrator.registry.getTool(replacement.toolId);
      if (!replacementTool) {
        throw createControlError(`Replacement tool '${replacement.toolId}' is unavailable`, {
          code: 'constraint_conflict',
          statusCode: 409,
        });
      }

      if (ranking) {
        ranking.selectedToolId = replacement.toolId;
      }

      updatedNodeIds.push(nodeId);
      return {
        ...step,
        toolId: replacement.toolId,
        tool: cloneToolForSelection(replacementTool),
        score: replacement.score,
        reasoning: `${step.reasoning} Constrained away from blocked skill '${step.toolId}'.`,
      };
    });

    return {
      selection: {
        ...snapshot.selection,
        selectedSteps: nextSteps,
        rankings: nextRankings,
      },
      updatedNodeIds,
    };
  }

  _mergeGraphState(previousGraph, nextGraph, updatedNodeIds) {
    const previousNodeById = new Map(previousGraph.nodes.map((node) => [node.id, node]));
    const previousEdgeById = new Map(previousGraph.edges.map((edge) => [edge.id, edge]));

    return {
      ...nextGraph,
      nodes: nextGraph.nodes.map((node) => {
        const previous = previousNodeById.get(node.id);
        if (!previous) {
          return node;
        }

        if (!updatedNodeIds.includes(node.id)) {
          return {
            ...node,
            state: previous.state,
          };
        }

        return {
          ...node,
          state: previous.state === 'completed' ? 'completed' : 'queued',
        };
      }),
      edges: nextGraph.edges.map((edge) => {
        const previous = previousEdgeById.get(edge.id);
        return previous ? { ...edge, state: previous.state } : edge;
      }),
    };
  }
}

function stableId(prefix, ...parts) {
  const hash = createHash('sha1')
    .update(parts.join('|'))
    .digest('hex')
    .slice(0, 10);
  return `${prefix}_${hash}`;
}

function cloneToolForSelection(tool) {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    keywords: Array.isArray(tool.keywords) ? [...tool.keywords] : [],
    metadata: tool.metadata ? { ...tool.metadata } : {},
  };
}
