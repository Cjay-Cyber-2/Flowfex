import { LIVE_AGENT_PRESENCE_MS } from '../../../shared/agentPresence.js';

export { LIVE_AGENT_PRESENCE_MS };

/**
 * Server-side agent presence — mirrors frontend rules so
 * dashboard gating and app-state resolution stay aligned.
 */

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
    return false;
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
