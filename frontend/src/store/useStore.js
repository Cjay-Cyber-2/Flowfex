import { create } from 'zustand';
import { buildApprovalQueue, buildDemoWorkspace } from './demoData';
import { CONTROL_EVENTS } from '../../../shared/control-contracts.js';

function syncSelectedNode(selectedNode, nodes) {
  if (!selectedNode) return null;
  return nodes.find((node) => node.id === selectedNode.id) || null;
}

function updateSessionHeartbeat(activeSession, heartbeat, status = 'live') {
  if (!activeSession) return null;

  return {
    ...activeSession,
    heartbeat,
    status,
    elapsed: 'Just now',
  };
}

function syncSessions(sessions, activeSession) {
  if (!activeSession) return sessions;

  const existing = sessions.some((session) => session.id === activeSession.id);
  if (!existing) return [activeSession, ...sessions];

  return sessions.map((session) =>
    session.id === activeSession.id ? { ...session, ...activeSession } : session
  );
}

function deriveSessionHeartbeat(snapshot) {
  if (!snapshot) return 'Session live';

  if (snapshot.status === 'paused') {
    return 'Execution paused';
  }

  if (snapshot.status === 'awaiting_approval') {
    const approvalNode = snapshot.graph?.nodes?.find((node) => node.state === 'approval');
    return approvalNode ? `Awaiting approval for ${approvalNode.title}` : 'Awaiting approval';
  }

  if (snapshot.status === 'running') {
    const activeNode = snapshot.graph?.nodes?.find((node) => node.id === snapshot.currentNodeId)
      || snapshot.graph?.nodes?.find((node) => node.state === 'active');
    return activeNode ? `Executing ${activeNode.title}` : 'Execution running';
  }

  if (snapshot.status === 'completed') {
    return 'Execution completed';
  }

  if (snapshot.status === 'failed') {
    return 'Execution failed';
  }

  return 'Session ready';
}

function applySessionSnapshotToState(state, snapshot) {
  const nodes = Array.isArray(snapshot?.graph?.nodes) ? snapshot.graph.nodes : [];
  const edges = Array.isArray(snapshot?.graph?.edges) ? snapshot.graph.edges : [];
  const activeSession = {
    ...(state.activeSession || {}),
    id: snapshot.sessionId,
    executionId: snapshot.executionId,
    task: snapshot.task,
    status: snapshot.status,
    revision: snapshot.revision,
    currentNodeId: snapshot.currentNodeId,
    pendingNodeId: snapshot.pendingNodeId,
    blockedSkillIds: snapshot.blockedSkillIds || [],
    heartbeat: deriveSessionHeartbeat(snapshot),
    elapsed: 'Just now',
  };

  return {
    nodes,
    edges,
    approvalQueue: buildApprovalQueue(nodes),
    selectedNode: syncSelectedNode(state.selectedNode, nodes),
    activeSession,
    sessions: syncSessions(state.sessions, activeSession),
    isExecuting: snapshot.status === 'running',
  };
}

function findFallbackTargetNode(nodes, sourceNodeId) {
  const sourceIndex = nodes.findIndex((node) => node.id === sourceNodeId);
  const fallbackPattern = /\b(manual|review|fallback|reject|alternate|rerout|human)\b/i;
  const tail = sourceIndex >= 0 ? nodes.slice(sourceIndex + 1) : nodes;

  return tail.find((node) =>
    node.state !== 'completed'
    && node.state !== 'skipped'
    && fallbackPattern.test(`${node.title} ${node.subtitle} ${node.reasoning}`)
  ) || null;
}

function runNodeTransition(state, nodeId, action) {
  const nodes = state.nodes.map((node) => ({ ...node }));
  const edges = state.edges.map((edge) => ({ ...edge }));
  const targetNode = nodes.find((node) => node.id === nodeId);

  if (!targetNode) return {};

  let heartbeat = state.activeSession?.heartbeat || 'Session live';
  let sessionStatus = state.activeSession?.status || 'live';
  let executing = state.isExecuting;

  if (action === 'pause') {
    const nextState = targetNode.state === 'paused' ? 'active' : 'paused';
    targetNode.state = nextState;
    heartbeat =
      nextState === 'paused'
        ? `Paused ${targetNode.title.toLowerCase()}`
        : `Resumed ${targetNode.title.toLowerCase()}`;
    executing = nextState !== 'paused';
  }

  if (nodeId === 'approval-gate') {
    const approvalToCompose = edges.find(
      (edge) => edge.from === 'approval-gate' && edge.to === 'response-compose'
    );
    const approvalToFallback = edges.find(
      (edge) => edge.from === 'approval-gate' && edge.to === 'manual-review'
    );
    const composeToPublish = edges.find(
      (edge) => edge.from === 'response-compose' && edge.to === 'publish-brief'
    );
    const reviewToPublish = edges.find(
      (edge) => edge.from === 'manual-review' && edge.to === 'publish-brief'
    );

    const composeNode = nodes.find((node) => node.id === 'response-compose');
    const publishNode = nodes.find((node) => node.id === 'publish-brief');
    const fallbackNode = nodes.find((node) => node.id === 'manual-review');

    if (action === 'approve') {
      targetNode.state = 'completed';
      if (approvalToCompose) approvalToCompose.state = 'active';
      if (approvalToFallback) approvalToFallback.state = 'rerouted';
      if (composeToPublish) composeToPublish.state = 'queued';
      if (reviewToPublish) reviewToPublish.state = 'inactive';
      if (composeNode) composeNode.state = 'active';
      if (publishNode) publishNode.state = 'queued';
      if (fallbackNode) fallbackNode.state = 'idle';
      heartbeat = 'Composing approved response';
      sessionStatus = 'live';
      executing = true;
    }

    if (action === 'reject' || action === 'reroute') {
      targetNode.state = action === 'reject' ? 'skipped' : 'completed';
      if (approvalToCompose) approvalToCompose.state = 'inactive';
      if (approvalToFallback) approvalToFallback.state = 'active';
      if (composeToPublish) composeToPublish.state = 'inactive';
      if (reviewToPublish) reviewToPublish.state = 'queued';
      if (composeNode) composeNode.state = 'idle';
      if (fallbackNode) fallbackNode.state = 'active';
      if (publishNode) publishNode.state = 'queued';
      heartbeat =
        action === 'reject'
          ? 'Approval rejected, rerouted to fallback review'
          : 'Rerouted through manual review lane';
      sessionStatus = 'live';
      executing = true;
    }
  }

  const approvalQueue = buildApprovalQueue(nodes);
  const activeSession = updateSessionHeartbeat(state.activeSession, heartbeat, sessionStatus);
  const selectedNode = syncSelectedNode(state.selectedNode, nodes);

  return {
    nodes,
    edges,
    approvalQueue,
    selectedNode,
    activeSession,
    sessions: syncSessions(state.sessions, activeSession),
    isExecuting: executing,
  };
}

const useStore = create((set, get) => ({
  user: {
    name: 'Chiji',
    initials: 'CC',
  },
  isAuthenticated: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  connectedAgents: [],
  addAgent: (agent) =>
    set((state) => {
      const incomingType = String(agent.type || 'Prompt').toUpperCase();
      const exists = state.connectedAgents.some((item) => item.id === agent.id);
      const nextAgent = {
        id: agent.id || `agent-${Date.now()}`,
        name: agent.name || 'Connected Agent',
        type: incomingType,
        status: agent.status || 'connected',
        lastSeen: agent.lastSeen || 'Live now',
      };

      const connectedAgents = exists
        ? state.connectedAgents.map((item) => (item.id === nextAgent.id ? nextAgent : item))
        : [...state.connectedAgents, nextAgent];

      const fallbackState = state.nodes.length
        ? {}
        : (() => {
            const workspace = buildDemoWorkspace(connectedAgents);
            const selectedNode =
              workspace.nodes.find((node) => node.id === workspace.selectedNodeId) || null;

            return {
              sessions: workspace.sessions,
              activeSession: workspace.activeSession,
              nodes: workspace.nodes,
              edges: workspace.edges,
              approvalQueue: workspace.approvalQueue,
              selectedNode,
              rightDrawerOpen: true,
              canvasMode: 'live',
              isExecuting: true,
            };
          })();

      const activeSession = state.activeSession
        ? updateSessionHeartbeat(state.activeSession, `${nextAgent.name} connected`, 'live')
        : fallbackState.activeSession || null;

      return {
        connectedAgents,
        activeSession,
        sessions: activeSession ? syncSessions(state.sessions, activeSession) : state.sessions,
        ...fallbackState,
      };
    }),
  removeAgent: (agentId) =>
    set((state) => ({
      connectedAgents: state.connectedAgents.filter((agent) => agent.id !== agentId),
    })),
  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      connectedAgents: state.connectedAgents.map((agent) =>
        agent.id === agentId ? { ...agent, status, lastSeen: 'Just now' } : agent
      ),
    })),

  sessions: [],
  activeSession: null,
  setActiveSession: (session) => {
    set((state) => ({
      activeSession: session,
      sessions: syncSessions(state.sessions, session),
    }));

    const ws = get().ws;
    if (session?.id && ws?.sessionId !== session.id) {
      ws.connect(session.id);
    }
    if (session?.id) {
      get().hydrateSessionState(session.id);
    }
  },
  updateSessionName: (name) =>
    set((state) => {
      if (!state.activeSession) return {};
      const activeSession = { ...state.activeSession, name };
      return {
        activeSession,
        sessions: syncSessions(state.sessions, activeSession),
      };
    }),
  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
    })),
  updateSession: (sessionId, updates) =>
    set((state) => {
      const sessions = state.sessions.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      );
      const activeSession =
        state.activeSession?.id === sessionId
          ? { ...state.activeSession, ...updates }
          : state.activeSession;

      return {
        sessions,
        activeSession,
      };
    }),

  canvasMode: 'flow',
  setCanvasMode: (mode) => set({ canvasMode: mode }),

  nodes: [],
  edges: [],
  setNodes: (nodes) =>
    set((state) => ({
      nodes,
      selectedNode: syncSelectedNode(state.selectedNode, nodes),
      approvalQueue: buildApprovalQueue(nodes),
    })),
  setEdges: (edges) => set({ edges }),
  addNode: (node) =>
    set((state) => {
      const nodes = [...state.nodes, node];
      return {
        nodes,
        approvalQueue: buildApprovalQueue(nodes),
      };
    }),
  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),
  updateNode: (nodeId, updates) =>
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      );
      return {
        nodes,
        selectedNode: syncSelectedNode(state.selectedNode, nodes),
        approvalQueue: buildApprovalQueue(nodes),
      };
    }),

  isExecuting: false,
  executionTrace: [],
  setIsExecuting: (isExecuting) =>
    set((state) => {
      const heartbeat = isExecuting
        ? state.activeSession?.heartbeat || 'Execution resumed'
        : 'Execution paused';
      const activeSession = updateSessionHeartbeat(state.activeSession, heartbeat, 'live');
      return {
        isExecuting,
        activeSession,
        sessions: syncSessions(state.sessions, activeSession),
      };
    }),
  addTraceStep: (step) =>
    set((state) => ({
      executionTrace: [...state.executionTrace, step],
    })),
  clearTrace: () => set({ executionTrace: [] }),

  selectedNode: null,
  setSelectedNode: (node) =>
    set({
      selectedNode: node,
      rightDrawerOpen: !!node,
    }),
  selectNode: (nodeId) =>
    set((state) => {
      const selectedNode = state.nodes.find((node) => node.id === nodeId) || null;
      return {
        selectedNode,
        rightDrawerOpen: !!selectedNode,
      };
    }),

  rightDrawerOpen: false,
  setRightDrawerOpen: (rightDrawerOpen) => set({ rightDrawerOpen }),

  connectModalOpen: false,
  setConnectModalOpen: (connectModalOpen) => set({ connectModalOpen }),

  approvalQueue: [],
  approveNode: (nodeId) => get().apiApproveNode(nodeId),
  rejectNode: (nodeId) => get().apiRejectNode(nodeId),
  rerouteNode: (nodeId, targetNodeId) => get().apiRerouteNode(nodeId, targetNodeId),
  pauseNode: () => (get().isExecuting ? get().apiPauseSession() : get().apiResumeSession()),

  notifications: [],
  addNotification: (notification) => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((item) => item.id !== id),
      }));
    }, 4000);
  },
  removeNotification: (id) =>
     set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),

  ws: null,
  setWs: (ws) => set({ ws }),

  usage: {
    steps: 0,
    limit: 100,
  },
  incrementUsage: () =>
    set((state) => ({
      usage: {
        ...state.usage,
        steps: state.usage.steps + 1,
      },
    })),

  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000',
  applySessionSnapshot: (snapshot) =>
    set((state) => applySessionSnapshotToState(state, snapshot)),

  /**
   * Initialize WebSocket event listeners that drive canvas animations from real events.
   * Call once when the app mounts.
   */
  initSocketListeners: () => {
    // Dynamic import for ESM (Vite)
    import('../services/socketClient.js').then(({ default: client }) => {
      const state = get();
      const sessionId = state.activeSession?.id || 'default';
      client.connect(sessionId);

      // ─── Orchestration Events ─────────────────────────────────────
      client.subscribe('orchestration', 'graph:created', (data) => {
        if (data.nodes && data.edges) {
          set({
            nodes: data.nodes,
            edges: data.edges,
            approvalQueue: buildApprovalQueue(data.nodes),
          });
        }
      });

      client.subscribe('orchestration', 'node:created', (data) => {
        if (data.node) {
          set((s) => {
            const nodes = [...s.nodes, data.node];
            return { nodes, approvalQueue: buildApprovalQueue(nodes) };
          });
        }
      });

      client.subscribe('orchestration', 'node:executing', (data) => {
        set((s) => {
          const nodes = s.nodes.map((n) =>
            n.id === data.nodeId ? { ...n, state: 'active' } : n
          );
          return {
            nodes,
            selectedNode: syncSelectedNode(s.selectedNode, nodes),
            approvalQueue: buildApprovalQueue(nodes),
            activeSession: updateSessionHeartbeat(s.activeSession, `Executing ${data.nodeId}`),
          };
        });
      });

      client.subscribe('orchestration', 'node:completed', (data) => {
        set((s) => {
          const nodes = s.nodes.map((n) =>
            n.id === data.nodeId ? { ...n, state: 'completed' } : n
          );
          return {
            nodes,
            selectedNode: syncSelectedNode(s.selectedNode, nodes),
            approvalQueue: buildApprovalQueue(nodes),
          };
        });
      });

      client.subscribe('orchestration', 'node:awaiting_approval', (data) => {
        set((s) => {
          const nodes = s.nodes.map((n) =>
            n.id === data.nodeId ? { ...n, state: 'approval' } : n
          );
          return {
            nodes,
            selectedNode: syncSelectedNode(s.selectedNode, nodes),
            approvalQueue: buildApprovalQueue(nodes),
            rightDrawerOpen: true,
          };
        });
      });

      client.subscribe('orchestration', 'node:approved', (data) => {
        set((s) => {
          const nodes = s.nodes.map((n) =>
            n.id === data.nodeId ? { ...n, state: 'completed' } : n
          );
          return {
            nodes,
            selectedNode: syncSelectedNode(s.selectedNode, nodes),
            approvalQueue: buildApprovalQueue(nodes),
          };
        });
      });

      client.subscribe('orchestration', 'node:rejected', (data) => {
        set((s) => {
          const nodes = s.nodes.map((n) =>
            n.id === data.nodeId ? { ...n, state: 'skipped' } : n
          );
          return {
            nodes,
            selectedNode: syncSelectedNode(s.selectedNode, nodes),
            approvalQueue: buildApprovalQueue(nodes),
          };
        });
      });

      client.subscribe('orchestration', 'node:error', (data) => {
        set((s) => {
          const nodes = s.nodes.map((n) =>
            n.id === data.nodeId ? { ...n, state: 'error' } : n
          );
          return {
            nodes,
            selectedNode: syncSelectedNode(s.selectedNode, nodes),
            approvalQueue: buildApprovalQueue(nodes),
          };
        });
      });

      client.subscribe('orchestration', 'edge:created', (data) => {
        if (data.edge) {
          set((s) => ({ edges: [...s.edges, data.edge] }));
        }
      });

      client.subscribe('orchestration', 'edge:active', (data) => {
        set((s) => ({
          edges: s.edges.map((e) =>
            e.id === data.edgeId ? { ...e, state: 'active' } : e
          ),
        }));
      });

      client.subscribe('orchestration', 'path:rerouted', (data) => {
        set((s) => {
          const exists = s.edges.some((edge) => edge.id === data.edgeId);
          return {
            edges: exists
              ? s.edges.map((edge) =>
                  edge.id === data.edgeId
                    ? { ...edge, state: 'rerouted' }
                    : edge
                )
              : [
                  ...s.edges,
                  {
                    id: data.edgeId,
                    from: data.from,
                    to: data.to,
                    state: 'rerouted',
                    label: 'reroute',
                    type: 'conditional',
                  },
                ],
          };
        });
      });

      // ─── Session Events ───────────────────────────────────────────
      client.subscribe('session', CONTROL_EVENTS.SESSION_STATE, (data) => {
        if (data?.snapshot) {
          get().applySessionSnapshot(data.snapshot);
        }
      });

      client.subscribe('session', 'session:paused', () => {
        set((s) => ({
          isExecuting: false,
          activeSession: updateSessionHeartbeat(s.activeSession, 'Execution paused'),
        }));
      });

      client.subscribe('session', 'session:resumed', () => {
        set((s) => ({
          isExecuting: true,
          activeSession: updateSessionHeartbeat(s.activeSession, 'Execution resumed'),
        }));
      });

      client.subscribe('session', 'agent:connected', (data) => {
        const agentData = {
          id: data.agentId || `agent-${Date.now()}`,
          name: data.agentName || 'Connected Agent',
          type: (data.connectionType || 'prompt').toUpperCase(),
          status: 'connected',
          lastSeen: 'Live now',
        };
        get().addAgent(agentData);
      });

      client.subscribe('control', CONTROL_EVENTS.SESSION_CONSTRAINED, (data) => {
        get().addNotification({
          title: 'Constraints updated',
          message: `Blocked ${data.blockedSkillIds?.length || 0} skill${data.blockedSkillIds?.length === 1 ? '' : 's'}.`,
          type: 'info',
        });
      });

      client.subscribe('control', CONTROL_EVENTS.CONTROL_ERROR, (data) => {
        get().addNotification({
          title: 'Control action failed',
          message: data?.message || 'The backend rejected the requested control action.',
          type: 'error',
        });
      });

      set({ ws: client });

      const latestSessionId = get().activeSession?.id;
      if (latestSessionId && client.sessionId !== latestSessionId) {
        client.connect(latestSessionId);
      }
    }).catch((err) => {
      console.warn('[Flowfex] Socket client import failed:', err.message);
    });
  },

  /**
   * Call backend API for control actions (approve/reject/reroute/pause)
   */
  apiApproveNode: async (nodeId) => {
    const state = get();
    const sessionId = state.activeSession?.id || 'default';
    const url = `${state.backendUrl}/node/${nodeId}/approve`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          expectedRevision: state.activeSession?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Approve request failed');
      }
      if (payload?.snapshot) {
        get().applySessionSnapshot(payload.snapshot);
      }
      return true;
    } catch (_error) {
      get().addNotification({
        title: 'Approve failed',
        message: 'The backend could not approve this node.',
        type: 'error',
      });
      return false;
    }
  },

  apiRejectNode: async (nodeId) => {
    const state = get();
    const sessionId = state.activeSession?.id || 'default';
    const url = `${state.backendUrl}/node/${nodeId}/reject`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          expectedRevision: state.activeSession?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Reject request failed');
      }
      if (payload?.snapshot) {
        get().applySessionSnapshot(payload.snapshot);
      }
      return true;
    } catch (_error) {
      get().addNotification({
        title: 'Reject failed',
        message: 'The backend could not reject this node.',
        type: 'error',
      });
      return false;
    }
  },

  apiRerouteNode: async (nodeId, targetNodeId) => {
    const state = get();
    const sessionId = state.activeSession?.id || 'default';
    const url = `${state.backendUrl}/node/${nodeId}/reroute`;
    const fallbackTargetId = targetNodeId || findFallbackTargetNode(state.nodes, nodeId)?.id;
    try {
      if (!fallbackTargetId) {
        throw new Error('No reroute target is available');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetNodeId: fallbackTargetId,
          expectedRevision: state.activeSession?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Reroute request failed');
      }
      if (payload?.snapshot) {
        get().applySessionSnapshot(payload.snapshot);
      }
      return true;
    } catch (_error) {
      get().addNotification({
        title: 'Reroute failed',
        message: 'The backend could not reroute this flow.',
        type: 'error',
      });
      return false;
    }
  },

  apiPauseSession: async () => {
    const state = get();
    const sessionId = state.activeSession?.id || 'default';
    const url = `${state.backendUrl}/session/${sessionId}/pause`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: state.activeSession?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Pause request failed');
      }
      if (payload?.snapshot) {
        get().applySessionSnapshot(payload.snapshot);
      }
      return true;
    } catch (_error) {
      get().addNotification({
        title: 'Pause failed',
        message: 'The backend could not pause this session.',
        type: 'error',
      });
      return false;
    }
  },

  apiResumeSession: async () => {
    const state = get();
    const sessionId = state.activeSession?.id || 'default';
    const url = `${state.backendUrl}/session/${sessionId}/resume`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: state.activeSession?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Resume request failed');
      }
      if (payload?.snapshot) {
        get().applySessionSnapshot(payload.snapshot);
      }
      return true;
    } catch (_error) {
      get().addNotification({
        title: 'Resume failed',
        message: 'The backend could not resume this session.',
        type: 'error',
      });
      return false;
    }
  },

  apiConstrainSession: async (blockedSkillIds) => {
    const state = get();
    const sessionId = state.activeSession?.id || 'default';
    const url = `${state.backendUrl}/session/${sessionId}/constrain`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockedSkillIds,
          expectedRevision: state.activeSession?.revision,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Constrain request failed');
      }
      if (payload?.snapshot) {
        get().applySessionSnapshot(payload.snapshot);
      }
      return true;
    } catch (_error) {
      get().addNotification({
        title: 'Constraint update failed',
        message: 'The backend could not update blocked skills for this session.',
        type: 'error',
      });
      return false;
    }
  },

  hydrateSessionState: async (sessionId) => {
    const backendUrl = get().backendUrl;
    try {
      const response = await fetch(`${backendUrl}/session/${sessionId}/state`);
      const payload = await response.json();
      if (!response.ok || !payload?.snapshot) {
        return;
      }

      get().applySessionSnapshot(payload.snapshot);
    } catch (_error) {
      // Keep demo workspace if the backend has no persisted state for this session.
    }
  },

  bootstrapWorkspace: () => {
    const state = get();
    if (state.nodes.length && state.edges.length && state.activeSession) return;

    const workspace = buildDemoWorkspace(state.connectedAgents);
    const selectedNode =
      workspace.nodes.find((node) => node.id === workspace.selectedNodeId) || null;

    set({
      connectedAgents: workspace.connectedAgents,
      sessions: workspace.sessions,
      activeSession: workspace.activeSession,
      nodes: workspace.nodes,
      edges: workspace.edges,
      approvalQueue: workspace.approvalQueue,
      selectedNode,
      rightDrawerOpen: true,
      canvasMode: 'flow',
      isExecuting: true,
    });

    const ws = get().ws;
    if (workspace.activeSession?.id && ws?.sessionId !== workspace.activeSession.id) {
      ws.connect(workspace.activeSession.id);
    }
    if (workspace.activeSession?.id) {
      get().hydrateSessionState(workspace.activeSession.id);
    }
  },
}));

export default useStore;
