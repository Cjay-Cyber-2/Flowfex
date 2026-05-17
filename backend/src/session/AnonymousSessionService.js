import { createHash, randomUUID } from 'node:crypto';
import { createSessionDataClient } from './sessionDataAccess.js';
import { logSessionError } from './sessionLogger.js';
import { toDashboardSessionRecord } from './sessionSerializers.js';
import { syniqSessions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

function firstResult(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function buildAnonymousToken() {
  const timestampHash = createHash('sha256')
    .update(`${Date.now()}:${randomUUID()}`)
    .digest('hex')
    .slice(0, 16);

  return `${randomUUID()}_${timestampHash}`;
}

function normalizeConnectedAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return null;
  }

  return {
    connectionId: agent.connectionId || null,
    id: agent.agentId || agent.id || 'agent',
    name: agent.agentName || agent.name || 'Connected Agent',
    type: agent.connectionType || agent.type || 'unknown',
    status: agent.status || 'connected',
    lastSeen: agent.syncedAt || new Date().toISOString(),
  };
}

function appendConnectionHistory(graphState, agent) {
  const timestamp = agent.lastSeen || new Date().toISOString();
  const nextGraphState = graphState && typeof graphState === 'object' ? { ...graphState } : {};
  const metadata = nextGraphState.metadata && typeof nextGraphState.metadata === 'object'
    ? { ...nextGraphState.metadata }
    : {};
  const history = Array.isArray(metadata.connectionHistory)
    ? [...metadata.connectionHistory]
    : [];
  const latest = history[history.length - 1] || null;

  if (
    latest
    && agent.connectionId
    && latest.connectionId === agent.connectionId
  ) {
    return nextGraphState;
  }

  if (
    latest
    && !agent.connectionId
    && latest.agentId === agent.id
    && latest.connectionType === agent.type
    && Date.parse(timestamp) - Date.parse(latest.connectedAt || '') < 15000
  ) {
    return nextGraphState;
  }

  history.push({
    connectionId: agent.connectionId,
    agentId: agent.id,
    agentName: agent.name,
    connectionType: agent.type,
    connectedAt: timestamp,
  });

  metadata.connectionHistory = history;
  nextGraphState.metadata = metadata;
  return nextGraphState;
}

function markAuthUpgrade(graphState, upgradedAt) {
  const nextGraphState = graphState && typeof graphState === 'object' ? { ...graphState } : {};
  const metadata = nextGraphState.metadata && typeof nextGraphState.metadata === 'object'
    ? { ...nextGraphState.metadata }
    : {};

  metadata.authUpgradeAt = upgradedAt;
  nextGraphState.metadata = metadata;
  return nextGraphState;
}

export class AnonymousSessionService {
  constructor(config = {}) {
    this.client = config.client || createSessionDataClient();
  }

  async createAnonymousSession() {
    const anonymousToken = buildAnonymousToken();
    const sessionId = randomUUID();

    try {
      const data = await this.client.insert(syniqSessions).values({
        id: sessionId,
        anonymous_token: anonymousToken,
      }).returning();

      const row = firstResult(data);

      return {
        sessionId: row?.id || sessionId,
        anonymousToken: row?.anonymous_token || anonymousToken,
      };
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.create',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async validateAnonymousSession(anonymousToken) {
    try {
      const data = await this.client
        .select()
        .from(syniqSessions)
        .where(eq(syniqSessions.anonymous_token, anonymousToken))
        .limit(1);

      const row = firstResult(data);
      return row ? toDashboardSessionRecord(row) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.validate',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async upgradeAnonymousSession({ anonymousToken, authId, displayName = null, avatarUrl = null }) {
    try {
      const existingRows = await this.client
        .select()
        .from(syniqSessions)
        .where(eq(syniqSessions.anonymous_token, anonymousToken))
        .limit(1);

      const existing = firstResult(existingRows);
      if (!existing) {
        return null;
      }

      if (existing.auth_id && existing.auth_id !== authId) {
        const error = new Error('This anonymous Syniq session is already assigned to another account.');
        error.code = 'session_ownership_conflict';
        error.statusCode = 409;
        throw error;
      }

      if (existing.auth_id === authId) {
        return toDashboardSessionRecord(existing);
      }

      const upgradedAt = new Date().toISOString();
      const graphState = markAuthUpgrade(existing.graph_state, upgradedAt);

      const data = await this.client
        .update(syniqSessions)
        .set({
          auth_id: authId,
          graph_state: graphState,
          last_active_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(syniqSessions.anonymous_token, anonymousToken))
        .returning();

      const row = firstResult(data);
      return row ? toDashboardSessionRecord(row) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.upgrade',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async getMostRecentSessionForUser(authId) {
    try {
      const data = await this.client
        .select()
        .from(syniqSessions)
        .where(eq(syniqSessions.auth_id, authId))
        .orderBy(desc(syniqSessions.last_active_at))
        .limit(1);

      const row = firstResult(data);
      return row ? toDashboardSessionRecord(row) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.get_most_recent_for_user',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async markConnectedAgent(sessionId, agent) {
    const normalizedAgent = normalizeConnectedAgent(agent);
    if (!sessionId || !normalizedAgent) {
      return null;
    }

    try {
      const existingRows = await this.client
        .select({
          connected_agents: syniqSessions.connected_agents,
          graph_state: syniqSessions.graph_state,
        })
        .from(syniqSessions)
        .where(eq(syniqSessions.id, sessionId))
        .limit(1);

      const existingRow = firstResult(existingRows);
      const existingAgents = Array.isArray(existingRow?.connected_agents)
        ? existingRow.connected_agents
        : [];
      const graphState = appendConnectionHistory(existingRow?.graph_state, normalizedAgent);
      const nextAgents = [
        ...existingAgents.filter((entry) => entry?.id !== normalizedAgent.id),
        normalizedAgent,
      ];

      const data = await this.client
        .update(syniqSessions)
        .set({
          connected_agents: nextAgents,
          graph_state: graphState,
          last_active_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(syniqSessions.id, sessionId))
        .returning();

      const row = firstResult(data);
      return row ? toDashboardSessionRecord(row) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.mark_connected_agent',
        sessionId,
        error,
      });
      throw error;
    }
  }
}
