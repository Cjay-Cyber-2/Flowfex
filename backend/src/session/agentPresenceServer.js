/**
 * Server-side agent presence — mirrors frontend `agentPresence.js` so
 * dashboard gating and app-state resolution use the same recency rules.
 */
export const LIVE_AGENT_PRESENCE_MS = 3 * 60 * 1000;

export function isLiveConnectedAgentServer(agent) {
  if (!agent || typeof agent !== 'object') {
    return false;
  }
  if (agent.status && agent.status !== 'connected') {
    return false;
  }
  const raw = agent.lastSeen || agent.syncedAt || agent.connectedAt || agent.lastSeenAt;
  const t = Date.parse(raw || '');
  if (Number.isNaN(t)) {
    return agent.status === 'connected';
  }
  return Date.now() - t < LIVE_AGENT_PRESENCE_MS;
}

export function sessionHasLiveAgentFromRecord(sessionRecord) {
  const agents = sessionRecord?.connectedAgents || sessionRecord?.connected_agents;
  if (!Array.isArray(agents)) {
    return false;
  }
  return agents.some(isLiveConnectedAgentServer);
}
