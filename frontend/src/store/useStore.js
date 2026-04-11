import { create } from 'zustand';
import { buildApprovalQueue, buildDemoWorkspace } from './demoData';

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
  setActiveSession: (session) =>
    set((state) => ({
      activeSession: session,
      sessions: syncSessions(state.sessions, session),
    })),
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
  approveNode: (nodeId) => set((state) => runNodeTransition(state, nodeId, 'approve')),
  rejectNode: (nodeId) => set((state) => runNodeTransition(state, nodeId, 'reject')),
  rerouteNode: (nodeId) => set((state) => runNodeTransition(state, nodeId, 'reroute')),
  pauseNode: (nodeId) => set((state) => runNodeTransition(state, nodeId, 'pause')),

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

  bootstrapWorkspace: () =>
    set((state) => {
      if (state.nodes.length && state.edges.length && state.activeSession) return {};

      const workspace = buildDemoWorkspace(state.connectedAgents);
      const selectedNode =
        workspace.nodes.find((node) => node.id === workspace.selectedNodeId) || null;

      return {
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
      };
    }),
}));

export default useStore;
