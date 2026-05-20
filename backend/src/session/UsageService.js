import { createSessionDataClient } from './sessionDataAccess.js';
import { logSessionError } from './sessionLogger.js';
import { syniqSessions, usageTracking } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { isProAuthId } from './proTier.js';
import { isLiveConnectedAgentServer } from './agentPresenceServer.js';

// ─── Policy Definitions ──────────────────────────────────────────────────────

export const SYNIQ_LIMITS = {
  anonymous: {
    // The user-visible quota for an anonymous Syniq session is "6 requests
    // per 5-hour window after a verified attach". We keep maxConnectionsPerDay loose
    // so a real agent can re-attach across the day while the request quota
    // is the actual cap that drives the sign-up wall.
    maxConnectionsPerDay: 20,
    maxExecutionsPerSession: 6,
    maxNodesPerSession: 50,
    maxSessionDurationMinutes: 60,
    maxConcurrentAgents: 1,
    maxConcurrentSessions: 1,
    warningThreshold: 0.8,
  },
  authenticated: {
    // Free authenticated tier gets 6 requests per 5-hour window. After they finish,
    // the dashboard pops the pricing card; payment unlocks the paid plan
    // (handled separately) — otherwise the quota renews the next day.
    // Keep the free tier to one active agent/session so multi-agent usage
    // stays a paid capability instead of an auth bypass.
    maxConnectionsPerDay: 20,
    maxExecutionsPerDay: 6,
    maxNodesPerDay: 100,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 1,
    maxConcurrentSessions: 1,
    warningThreshold: 0.8,
  },
  api_key: {
    maxConnectionsPerDay: 5,
    maxExecutionsPerDay: 100,
    maxNodesPerDay: 1000,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 10,
    maxConcurrentSessions: 5,
    warningThreshold: 0.8,
  },
  pro: {
    maxConnectionsPerDay: 200,
    maxExecutionsPerDay: 100000,
    maxNodesPerDay: 100000,
    maxSessionDurationMinutes: 1440,
    maxConcurrentAgents: 50,
    maxConcurrentSessions: 25,
    warningThreshold: 0.9,
  },
};

const QUOTA_WINDOW_MS = 5 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function sumUsageRows(rows) {
  return rows.reduce((acc, row) => ({
    executionsCount: acc.executionsCount + Number(row.executions_count || 0),
    nodesProcessed: acc.nodesProcessed + Number(row.nodes_processed || 0),
    sessionDurationSeconds: acc.sessionDurationSeconds + Number(row.session_duration_seconds || 0),
  }), {
    executionsCount: 0,
    nodesProcessed: 0,
    sessionDurationSeconds: 0,
  });
}

function parseTimestamp(value) {
  const timestampMs = Date.parse(value || '');
  return Number.isNaN(timestampMs) ? null : timestampMs;
}

/**
 * Anonymous duration must NOT use wall-clock age of the session row (stale
 * tokens, shared prompts). Only count time after a verified attach anchor
 * exists; otherwise use usage-tracked seconds only.
 */
function computeSessionDurationSeconds({ tier, session, summedUsage, nowMs }) {
  if (tier !== 'anonymous') {
    const createdAtMs = parseTimestamp(session?.created_at);
    if (createdAtMs === null) {
      return summedUsage.sessionDurationSeconds;
    }
    return Math.max(
      summedUsage.sessionDurationSeconds,
      Math.floor((nowMs - createdAtMs) / 1000)
    );
  }

  let anchorMs = null;
  const history = session?.graph_state?.metadata?.connectionHistory;
  if (Array.isArray(history)) {
    for (const entry of history) {
      const t = parseTimestamp(entry?.connectedAt);
      if (t !== null && (anchorMs === null || t < anchorMs)) {
        anchorMs = t;
      }
    }
  }

  const agents = Array.isArray(session?.connected_agents) ? session.connected_agents : [];
  if (anchorMs === null && agents.length > 0) {
    for (const agent of agents) {
      const t = parseTimestamp(agent?.connectedAt || agent?.lastSeen || agent?.syncedAt);
      if (t !== null && (anchorMs === null || t < anchorMs)) {
        anchorMs = t;
      }
    }
  }

  if (anchorMs === null) {
    return summedUsage.sessionDurationSeconds;
  }

  return Math.max(
    summedUsage.sessionDurationSeconds,
    Math.floor((nowMs - anchorMs) / 1000)
  );
}

function getAuthUpgradeBoundary(sessionRow) {
  return parseTimestamp(sessionRow?.graph_state?.metadata?.authUpgradeAt);
}

function normalizeConnectionEvents(sessionRow, minimumTimestampMs = null) {
  const history = sessionRow?.graph_state?.metadata?.connectionHistory;
  if (Array.isArray(history) && history.length > 0) {
    return history
      .map((entry) => ({
        connectedAt: entry?.connectedAt || null,
      }))
      .filter((entry) => {
        const connectedAtMs = parseTimestamp(entry.connectedAt);
        if (connectedAtMs === null) {
          return false;
        }

        return minimumTimestampMs === null || connectedAtMs >= minimumTimestampMs;
      });
  }

  if (Array.isArray(sessionRow?.connected_agents) && sessionRow.connected_agents.length > 0) {
    const fallbackTimestamp = sessionRow.last_active_at || sessionRow.created_at || null;
    const fallbackTimestampMs = parseTimestamp(fallbackTimestamp);
    if (minimumTimestampMs !== null && (fallbackTimestampMs === null || fallbackTimestampMs < minimumTimestampMs)) {
      return [];
    }

    return [{
      connectedAt: fallbackTimestamp,
    }].filter((entry) => entry.connectedAt);
  }

  return [];
}

function countRecentConnections(sessionRows, rollingWindowStart, tier) {
  return sessionRows.reduce((count, row) => {
    const authUpgradeBoundary = tier === 'anonymous' ? null : getAuthUpgradeBoundary(row);
    const minimumTimestampMs = authUpgradeBoundary === null
      ? rollingWindowStart.getTime()
      : Math.max(rollingWindowStart.getTime(), authUpgradeBoundary);
    const events = normalizeConnectionEvents(row, minimumTimestampMs);
    return count + events.filter((event) => {
      const connectedAtMs = parseTimestamp(event.connectedAt);
      return connectedAtMs !== null && connectedAtMs >= minimumTimestampMs;
    }).length;
  }, 0);
}

function countConcurrentAgents(sessionRow, tier) {
  const agents = Array.isArray(sessionRow?.connected_agents) ? sessionRow.connected_agents : [];
  if (agents.length === 0) {
    return 0;
  }

  if (tier === 'anonymous') {
    return agents.filter(isLiveConnectedAgentServer).length;
  }

  const authUpgradeBoundary = getAuthUpgradeBoundary(sessionRow);
  if (authUpgradeBoundary === null) {
    return agents.length;
  }

  return agents.filter((agent) => {
    const lastSeenMs = parseTimestamp(agent?.lastSeen);
    return lastSeenMs !== null && lastSeenMs >= authUpgradeBoundary;
  }).length;
}

/**
 * Determine which limit is blocked, if any.
 * Returns { status, tier, limit, reason, currentValue, limitValue } or null.
 */
function buildBlockedLimit(tier, usage, limits) {
  // Execution limits
  if (tier === 'anonymous' && usage.executionsCount >= limits.maxExecutionsPerSession) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxExecutionsPerSession',
      reason: `Your connected agent has used all ${limits.maxExecutionsPerSession} free Syniq skill or tool requests for this window. Sign up to keep going, or wait about 5 hours for your quota to renew.`,
      currentValue: usage.executionsCount,
      limitValue: limits.maxExecutionsPerSession,
    };
  }
  if (tier !== 'anonymous' && usage.executionsCount >= (limits.maxExecutionsPerDay || Infinity)) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxExecutionsPerDay',
      reason: 'You have reached the 5-hour Syniq skill and tool request allowance for this account. Upgrade to Pro or wait for the quota window to renew.',
      currentValue: usage.executionsCount,
      limitValue: limits.maxExecutionsPerDay,
    };
  }

  // Node limits
  if (tier === 'anonymous' && usage.nodesProcessed >= limits.maxNodesPerSession) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxNodesPerSession',
      reason: 'Anonymous sessions are limited to fifteen processed nodes.',
      currentValue: usage.nodesProcessed,
      limitValue: limits.maxNodesPerSession,
    };
  }
  if (tier !== 'anonymous' && usage.nodesProcessed >= (limits.maxNodesPerDay || Infinity)) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxNodesPerDay',
      reason: 'You have reached the 24-hour processed-node allowance.',
      currentValue: usage.nodesProcessed,
      limitValue: limits.maxNodesPerDay,
    };
  }

  // Duration limit
  const durationMinutes = usage.sessionDurationSeconds / 60;
  if (durationMinutes >= limits.maxSessionDurationMinutes) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxSessionDurationMinutes',
      reason: 'This session has reached its allowed duration.',
      currentValue: Math.floor(durationMinutes),
      limitValue: limits.maxSessionDurationMinutes,
    };
  }

  return null;
}

function buildConnectionBlockedLimit(tier, usage, limits) {
  if (usage.connectionsCount >= (limits.maxConnectionsPerDay || Infinity)) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxConnectionsPerDay',
      reason: tier === 'anonymous'
        ? `This anonymous Syniq session has hit the daily attach cap (${limits.maxConnectionsPerDay} verified attaches). Sign up to continue.`
        : `This account has hit the daily attach cap (${limits.maxConnectionsPerDay} verified attaches). Wait for the next reset or upgrade your plan.`,
      currentValue: usage.connectionsCount,
      limitValue: limits.maxConnectionsPerDay,
    };
  }

  if (usage.concurrentAgents >= limits.maxConcurrentAgents) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxConcurrentAgents',
      reason: 'The maximum number of concurrent connected agents has been reached.',
      currentValue: usage.concurrentAgents,
      limitValue: limits.maxConcurrentAgents,
    };
  }

  return null;
}

/**
 * Detect if any limit is approaching (>=80% of threshold).
 * Returns the first approaching limit or null.
 */
function buildWarningLimit(tier, usage, limits) {
  const threshold = limits.warningThreshold || 0.8;
  const checks = [];

  checks.push({ key: 'maxConnectionsPerDay', current: usage.connectionsCount, max: limits.maxConnectionsPerDay });

  if (tier === 'anonymous') {
    checks.push({ key: 'maxExecutionsPerSession', current: usage.executionsCount, max: limits.maxExecutionsPerSession });
    checks.push({ key: 'maxNodesPerSession', current: usage.nodesProcessed, max: limits.maxNodesPerSession });
  } else {
    checks.push({ key: 'maxExecutionsPerDay', current: usage.executionsCount, max: limits.maxExecutionsPerDay });
    checks.push({ key: 'maxNodesPerDay', current: usage.nodesProcessed, max: limits.maxNodesPerDay });
  }

  checks.push({ key: 'maxSessionDurationMinutes', current: usage.sessionDurationSeconds / 60, max: limits.maxSessionDurationMinutes });
  checks.push({ key: 'maxConcurrentAgents', current: usage.concurrentAgents, max: limits.maxConcurrentAgents });

  for (const check of checks) {
    if (check.max && check.current >= check.max * threshold && check.current < check.max) {
      return {
        status: 'approaching',
        tier,
        limit: check.key,
        reason: `You are approaching the ${check.key} limit.`,
        currentValue: Math.floor(check.current),
        limitValue: check.max,
        percentUsed: Math.round((check.current / check.max) * 100),
      };
    }
  }

  return null;
}

function createLimitError(status, sessionId) {
  const error = new Error(status.blockedLimit?.reason || 'Usage limit reached.');
  error.code = 'limit_reached';
  error.statusCode = 403;
  error.details = {
    sessionId,
    tier: status.tier,
    blockedLimit: status.blockedLimit,
    warningLimit: status.warningLimit || null,
  };
  return error;
}

function createConnectionLimitError(status, sessionId) {
  const error = new Error(status.connectionBlockedLimit?.reason || 'Connection limit reached.');
  error.code = 'limit_reached';
  error.statusCode = 403;
  error.details = {
    sessionId,
    tier: status.tier,
    blockedLimit: status.blockedLimit || null,
    connectionBlockedLimit: status.connectionBlockedLimit || null,
    warningLimit: status.warningLimit || null,
  };
  return error;
}

// ─── UsageService ─────────────────────────────────────────────────────────────

export class UsageService {
  constructor(config = {}) {
    this.client = config.client || createSessionDataClient();
    this.socketServer = config.socketServer || null;
  }

  setSocketServer(socketServer) {
    this.socketServer = socketServer;
  }

  /**
   * Resolve the tier for a given identity context.
   */
  resolveTier({ authId, apiKeyId }) {
    if (apiKeyId) return 'api_key';
    if (authId && isProAuthId(authId)) return 'pro';
    if (authId) return 'authenticated';
    return 'anonymous';
  }

  /**
   * Get comprehensive usage status for a session.
   */
  async getUsageStatus({ sessionId, apiKeyId = null }) {
    if (!sessionId) {
      return null;
    }

    try {
      const sessionRow = await this.client
        .select({
          id: syniqSessions.id,
          auth_id: syniqSessions.auth_id,
          anonymous_token: syniqSessions.anonymous_token,
          connected_agents: syniqSessions.connected_agents,
          created_at: syniqSessions.created_at,
          graph_state: syniqSessions.graph_state,
        })
        .from(syniqSessions)
        .where(eq(syniqSessions.id, sessionId))
        .limit(1);

      const session = firstRow(sessionRow);
      if (!session) {
        return null;
      }

      const tier = this.resolveTier({ authId: session.auth_id, apiKeyId });
      const limits = SYNIQ_LIMITS[tier];
      const nowMs = Date.now();
      const rollingWindowStart = new Date(nowMs - ONE_DAY_MS);
      let connectionSessionRows;

      let usageRows;
      if (tier === 'anonymous') {
        usageRows = await this.client
          .select()
          .from(usageTracking)
          .where(
            sql`${usageTracking.session_id} = ${sessionId} AND ${usageTracking.period_start} >= ${rollingWindowStart}`
          );
        connectionSessionRows = session.anonymous_token
          ? await this.client
              .select({
                id: syniqSessions.id,
                graph_state: syniqSessions.graph_state,
                connected_agents: syniqSessions.connected_agents,
                created_at: syniqSessions.created_at,
                last_active_at: syniqSessions.last_active_at,
              })
              .from(syniqSessions)
              .where(eq(syniqSessions.anonymous_token, session.anonymous_token))
          : [];
      } else {
        usageRows = await this.client
          .select()
          .from(usageTracking)
          .where(
            sql`${usageTracking.auth_id} = ${session.auth_id} AND ${usageTracking.period_start} >= ${rollingWindowStart}`
          );
        connectionSessionRows = session.auth_id
          ? await this.client
              .select({
                id: syniqSessions.id,
                graph_state: syniqSessions.graph_state,
                connected_agents: syniqSessions.connected_agents,
                created_at: syniqSessions.created_at,
                last_active_at: syniqSessions.last_active_at,
              })
              .from(syniqSessions)
              .where(eq(syniqSessions.auth_id, session.auth_id))
          : [];
      }

      const normalizedRows = Array.isArray(usageRows) ? usageRows : [];
      const normalizedConnectionRows = Array.isArray(connectionSessionRows) ? connectionSessionRows : [];
      const summedUsage = sumUsageRows(normalizedRows);
      const computedDurationSeconds = computeSessionDurationSeconds({
        tier,
        session,
        summedUsage,
        nowMs,
      });
      const concurrentAgents = countConcurrentAgents(session, tier);
      const connectionsCount = countRecentConnections(normalizedConnectionRows, rollingWindowStart, tier);

      const usage = {
        connectionsCount,
        executionsCount: summedUsage.executionsCount,
        nodesProcessed: summedUsage.nodesProcessed,
        sessionDurationSeconds: computedDurationSeconds,
        concurrentAgents,
      };

      const sessionCreatedAtMs = parseTimestamp(session.created_at);
      const resetBaseMs = normalizedRows.reduce((lowest, row) => {
        const rowMs = Date.parse(row.period_start || row.created_at || '');
        if (Number.isNaN(rowMs)) return lowest;
        if (lowest === null || rowMs < lowest) return rowMs;
        return lowest;
      }, null) ?? sessionCreatedAtMs;

      const resetWindowMs = QUOTA_WINDOW_MS;

      const blockedLimit = buildBlockedLimit(tier, usage, limits);
      const connectionBlockedLimit = buildConnectionBlockedLimit(tier, usage, limits);
      const warningLimit = blockedLimit || connectionBlockedLimit ? null : buildWarningLimit(tier, usage, limits);

      const safeResetBaseMs = typeof resetBaseMs === 'number' && !Number.isNaN(resetBaseMs)
        ? resetBaseMs
        : null;

      return {
        ok: true,
        tier,
        sessionId,
        authId: session.auth_id || null,
        anonymousToken: session.anonymous_token || null,
        usage,
        limits,
        blockedLimit,
        connectionBlockedLimit,
        warningLimit,
        resetAt: safeResetBaseMs === null ? null : new Date(safeResetBaseMs + resetWindowMs).toISOString(),
      };
    } catch (error) {
      logSessionError({ operation: 'usage.get_status', sessionId, error });
      throw error;
    }
  }

  /**
   * Assert that execution is allowed for a session. Throws if blocked.
   */
  async assertExecutionAllowed({ sessionId, apiKeyId = null }) {
    const status = await this.getUsageStatus({ sessionId, apiKeyId });
    if (!status) {
      return null;
    }

    if (status.blockedLimit) {
      // Emit real-time event before throwing
      this._emitLimitEvent(sessionId, 'limit:execution_blocked', {
        tier: status.tier,
        blockedLimit: status.blockedLimit,
        usage: status.usage,
      });
      throw createLimitError(status, sessionId);
    }

    // Emit warning if approaching
    if (status.warningLimit) {
      this._emitLimitEvent(sessionId, 'limit:approaching', {
        tier: status.tier,
        warningLimit: status.warningLimit,
        usage: status.usage,
      });
    }

    return status;
  }

  /**
   * Assert that concurrent session limit is not exceeded for a user.
   */
  async assertConcurrentSessionLimit({ authId, apiKeyId = null }) {
    if (!authId) {
      // Anonymous users get 1 concurrent session, enforced by token
      return true;
    }

    const tier = this.resolveTier({ authId, apiKeyId });
    const limits = SYNIQ_LIMITS[tier];

    try {
      const activeSessions = await this.client
        .select({ id: syniqSessions.id })
        .from(syniqSessions)
        .where(
          sql`${syniqSessions.auth_id} = ${authId} AND ${syniqSessions.status} IN ('active', 'paused')`
        );

      const count = Array.isArray(activeSessions) ? activeSessions.length : 0;
      if (count >= limits.maxConcurrentSessions) {
        const error = new Error(`Maximum concurrent sessions (${limits.maxConcurrentSessions}) reached for this account.`);
        error.code = 'concurrent_session_limit';
        error.statusCode = 403;
        error.details = { tier, currentValue: count, limitValue: limits.maxConcurrentSessions };
        throw error;
      }

      return true;
    } catch (error) {
      if (error.code === 'concurrent_session_limit') throw error;
      logSessionError({ operation: 'usage.concurrent_session_check', sessionId: null, error });
      throw error;
    }
  }

  /**
   * Assert that adding another agent connection is allowed.
   */
  async assertAgentConnectionAllowed({ sessionId, apiKeyId = null }) {
    const status = await this.getUsageStatus({ sessionId, apiKeyId });
    if (!status) return true;

    if (status.connectionBlockedLimit) {
      this._emitLimitEvent(sessionId, 'limit:agent_blocked', {
        tier: status.tier,
        blockedLimit: status.connectionBlockedLimit,
        usage: status.usage,
      });

      throw createConnectionLimitError(status, sessionId);
    }

    return true;
  }

  /**
   * Record an execution and emit usage-updated event.
   */
  async recordExecution({ sessionId, nodesProcessed = 0, apiKeyId = null }) {
    if (!sessionId) return null;

    try {
      const sessionRow = await this.client
        .select({
          auth_id: syniqSessions.auth_id,
          anonymous_token: syniqSessions.anonymous_token,
        })
        .from(syniqSessions)
        .where(eq(syniqSessions.id, sessionId))
        .limit(1);

      const session = firstRow(sessionRow);

      const usageId = randomUUID();
      const data = await this.client.insert(usageTracking).values({
        id: usageId,
        session_id: sessionId,
        auth_id: session?.auth_id || null,
        executions_count: 1,
        nodes_processed: Math.max(0, Number(nodesProcessed) || 0),
        session_duration_seconds: 0,
      }).returning();

      // Emit usage update after recording
      const updatedStatus = await this.getUsageStatus({ sessionId, apiKeyId });
      if (updatedStatus) {
        this._emitLimitEvent(sessionId, 'limit:usage_updated', {
          tier: updatedStatus.tier,
          usage: updatedStatus.usage,
          limits: updatedStatus.limits,
          blockedLimit: updatedStatus.blockedLimit,
          warningLimit: updatedStatus.warningLimit,
        });
      }

      return firstRow(data);
    } catch (error) {
      logSessionError({ operation: 'usage.record_execution', sessionId, error });
      throw error;
    }
  }

  /**
   * Emit a limit event via WebSocket if socketServer is available.
   */
  _emitLimitEvent(sessionId, eventType, payload) {
    if (!this.socketServer || !sessionId) return;

    try {
      this.socketServer.emitLimitEvent(sessionId, eventType, {
        sessionId,
        timestamp: new Date().toISOString(),
        ...payload,
      });
    } catch {
      // Best-effort — never break execution for a WS emit failure
    }
  }
}
