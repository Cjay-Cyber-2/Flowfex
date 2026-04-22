function normalizeConnectedAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return null;
  }

  return {
    id: agent.id || 'agent',
    name: agent.name || 'Connected Agent',
    type: agent.type || 'unknown',
    status: 'connected',
  };
}

export function mapExecutionStatusToPersistedStatus(status) {
  if (status === 'paused') {
    return 'paused';
  }

  if (status === 'completed') {
    return 'completed';
  }

  if (status === 'failed' || status === 'error') {
    return 'error';
  }

  return 'active';
}

export function serializeConnectedAgentsFromSnapshot(snapshot) {
  const normalizedAgent = normalizeConnectedAgent(snapshot?.agent);

  return normalizedAgent ? [normalizedAgent] : [];
}

export function serializeGraphStateFromSnapshot(snapshot) {
  const graph = snapshot?.graph || {};

  return {
    sessionId: snapshot?.sessionId || null,
    executionId: snapshot?.executionId || null,
    status: snapshot?.status || 'ready',
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    edges: Array.isArray(graph.edges) ? graph.edges : [],
    currentNodeId: snapshot?.currentNodeId || null,
    pendingNodeId: snapshot?.pendingNodeId || null,
    executionPointer: snapshot?.pendingNodeId || snapshot?.currentNodeId || null,
    connectedAgents: serializeConnectedAgentsFromSnapshot(snapshot),
    constraints: Array.isArray(snapshot?.blockedSkillIds) ? snapshot.blockedSkillIds : [],
    mode: snapshot?.sessionContext?.mode || 'live',
    outputs: snapshot?.outputs || {},
    errors: snapshot?.errors || {},
    metadata: {
      task: snapshot?.task || null,
      revision: snapshot?.revision ?? 0,
    },
  };
}

export function toDashboardSessionRecord(sessionRow) {
  if (!sessionRow) {
    return null;
  }

  return {
    id: sessionRow.id,
    name: sessionRow.name || 'Flowfex Session',
    task: sessionRow.graph_state?.metadata?.task || 'Live orchestration',
    heartbeat: sessionRow.status === 'paused' ? 'Execution paused' : 'Session live',
    status: sessionRow.status || 'active',
    elapsed: 'Just now',
    graphState: sessionRow.graph_state || {},
    mode: sessionRow.mode || 'live',
    executionPointer: sessionRow.execution_pointer || null,
    connectedAgents: Array.isArray(sessionRow.connected_agents) ? sessionRow.connected_agents : [],
    constraints: Array.isArray(sessionRow.constraints) ? sessionRow.constraints : [],
    authId: sessionRow.auth_id || null,
    anonymousToken: sessionRow.anonymous_token || null,
    updatedAt: sessionRow.updated_at || null,
    lastActiveAt: sessionRow.last_active_at || null,
  };
}
