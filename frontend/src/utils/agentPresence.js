/** Agents hydrated from the API can be stale (another device, old tab). Only treat as "present" if recently seen or explicitly connected without a timestamp yet. */
export const LIVE_AGENT_PRESENCE_MS = 3 * 60 * 1000;

export function isLiveConnectedAgent(agent) {
  if (!agent) return false;
  if (agent.status && agent.status !== 'connected') return false;
  const raw = agent.lastSeen || agent.syncedAt || agent.connectedAt || agent.lastSeenAt;
  const t = Date.parse(raw || '');
  if (Number.isNaN(t)) {
    return agent.status === 'connected';
  }
  return Date.now() - t < LIVE_AGENT_PRESENCE_MS;
}

export function filterLiveConnectedAgents(agents) {
  if (!Array.isArray(agents)) return [];
  return agents.filter(isLiveConnectedAgent);
}
