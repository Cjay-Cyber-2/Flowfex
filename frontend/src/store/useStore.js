import { create } from 'zustand';

const useStore = create((set, get) => ({
  // User state
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  // Agent state
  connectedAgents: [],
  addAgent: (agent) => set((state) => ({
    connectedAgents: [...state.connectedAgents, agent]
  })),
  removeAgent: (agentId) => set((state) => ({
    connectedAgents: state.connectedAgents.filter(a => a.id !== agentId)
  })),
  updateAgentStatus: (agentId, status) => set((state) => ({
    connectedAgents: state.connectedAgents.map(a =>
      a.id === agentId ? { ...a, status } : a
    )
  })),
  
  // Session state
  sessions: [],
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
  addSession: (session) => set((state) => ({
    sessions: [session, ...state.sessions]
  })),
  updateSession: (sessionId, updates) => set((state) => ({
    sessions: state.sessions.map(s =>
      s.id === sessionId ? { ...s, ...updates } : s
    ),
    activeSession: state.activeSession?.id === sessionId
      ? { ...state.activeSession, ...updates }
      : state.activeSession
  })),
  
  // Canvas state
  canvasMode: 'map', // 'map' | 'flow' | 'live'
  setCanvasMode: (mode) => set({ canvasMode: mode }),
  
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  updateNode: (nodeId, updates) => set((state) => ({
    nodes: state.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n)
  })),
  
  // Execution state
  isExecuting: false,
  executionTrace: [],
  setIsExecuting: (executing) => set({ isExecuting: executing }),
  addTraceStep: (step) => set((state) => ({
    executionTrace: [...state.executionTrace, step]
  })),
  clearTrace: () => set({ executionTrace: [] }),
  
  // UI state
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),
  
  rightDrawerOpen: false,
  setRightDrawerOpen: (open) => set({ rightDrawerOpen: open }),
  
  approvalQueue: [],
  addApproval: (approval) => set((state) => ({
    approvalQueue: [...state.approvalQueue, approval]
  })),
  removeApproval: (approvalId) => set((state) => ({
    approvalQueue: state.approvalQueue.filter(a => a.id !== approvalId)
  })),
  
  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, 4000);
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  
  // WebSocket connection
  ws: null,
  setWs: (ws) => set({ ws }),
  
  // Usage tracking
  usage: {
    steps: 0,
    limit: 100
  },
  incrementUsage: () => set((state) => ({
    usage: { ...state.usage, steps: state.usage.steps + 1 }
  }))
}));

export default useStore;
