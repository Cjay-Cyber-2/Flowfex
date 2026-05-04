import { createSessionDataClient } from './sessionDataAccess.js';
import { logSessionError } from './sessionLogger.js';
import { flowfexSessions, usageTracking } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// ─── Policy Definitions ──────────────────────────────────────────────────────

export const FLOWFEX_LIMITS = {
  anonymous: {
    maxExecutionsPerSession: 3,
    maxNodesPerSession: 15,
    maxSessionDurationMinutes: 30,
    maxConcurrentAgents: 1,
    maxConcurrentSessions: 1,
    warningThreshold: 0.8,
  },
  authenticated: {
    maxExecutionsPerDay: 50,
    maxNodesPerDay: 500,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 5,
    maxConcurrentSessions: 3,
    warningThreshold: 0.8,
  },
  api_key: {
    maxExecutionsPerDay: 100,
    maxNodesPerDay: 1000,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 10,
    maxConcurrentSessions: 5,
    warningThreshold: 0.8,
  },
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
      reason: 'Anonymous sessions are limited to three executions. Sign up to continue.',
      currentValue: usage.executionsCount,
      limitValue: limits.maxExecutionsPerSession,
    };
  }
  if (tier !== 'anonymous' && usage.executionsCount >= (limits.maxExecutionsPerDay || Infinity)) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxExecutionsPerDay',
      reason: 'You have reached the 24-hour execution allowance.',
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

  // Concurrent agents
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
          id: flowfexSessions.id,
          auth_id: flowfexSessions.auth_id,
          anonymous_token: flowfexSessions.anonymous_token,
          connected_agents: flowfexSessions.connected_agents,
          created_at: flowfexSessions.created_at,
        })
        .from(flowfexSessions)
        .where(eq(flowfexSessions.id, sessionId))
        .limit(1);

      const session = firstRow(sessionRow);
      if (!session) {
        return null;
      }

      const tier = this.resolveTier({ authId: session.auth_id, apiKeyId });
      const limits = FLOWFEX_LIMITS[tier];
      const nowMs = Date.now();
      const rollingWindowStart = new Date(nowMs - ONE_DAY_MS);

      let usageRows;
      if (tier === 'anonymous') {
        usageRows = await this.client
          .select()
          .from(usageTracking)
          .where(eq(usageTracking.session_id, sessionId));
      } else {
        usageRows = await this.client
          .select()
          .from(usageTracking)
          .where(
            sql`${usageTracking.auth_id} = ${session.auth_id} AND ${usageTracking.period_start} >= ${rollingWindowStart}`
          );
      }

      const normalizedRows = Array.isArray(usageRows) ? usageRows : [];
      const summedUsage = sumUsageRows(normalizedRows);
      const createdAtMs = Date.parse(session.created_at || '');
      const computedDurationSeconds = Number.isNaN(createdAtMs)
        ? summedUsage.sessionDurationSeconds
        : Math.max(summedUsage.sessionDurationSeconds, Math.floor((nowMs - createdAtMs) / 1000));
      const concurrentAgents = Array.isArray(session.connected_agents) ? session.connected_agents.length : 0;

      const usage = {
        executionsCount: summedUsage.executionsCount,
        nodesProcessed: summedUsage.nodesProcessed,
        sessionDurationSeconds: computedDurationSeconds,
        concurrentAgents,
      };

      const resetBaseMs = normalizedRows.reduce((lowest, row) => {
        const rowMs = Date.parse(row.period_start || row.created_at || '');
        if (Number.isNaN(rowMs)) return lowest;
        if (lowest === null || rowMs < lowest) return rowMs;
        return lowest;
      }, null) ?? createdAtMs;

      const resetWindowMs = tier === 'anonymous'
        ? limits.maxSessionDurationMinutes * 60 * 1000
        : ONE_DAY_MS;

      const blockedLimit = buildBlockedLimit(tier, usage, limits);
      const warningLimit = blockedLimit ? null : buildWarningLimit(tier, usage, limits);

      return {
        ok: true,
        tier,
        sessionId,
        authId: session.auth_id || null,
        anonymousToken: session.anonymous_token || null,
        usage,
        limits,
        blockedLimit,
        warningLimit,
        resetAt: Number.isNaN(resetBaseMs) ? null : new Date(resetBaseMs + resetWindowMs).toISOString(),
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
    const limits = FLOWFEX_LIMITS[tier];

    try {
      const activeSessions = await this.client
        .select({ id: flowfexSessions.id })
        .from(flowfexSessions)
        .where(
          sql`${flowfexSessions.auth_id} = ${authId} AND ${flowfexSessions.status} IN ('active', 'paused')`
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

    const limits = FLOWFEX_LIMITS[status.tier];
    if (status.usage.concurrentAgents >= limits.maxConcurrentAgents) {
      this._emitLimitEvent(sessionId, 'limit:agent_blocked', {
        tier: status.tier,
        currentAgents: status.usage.concurrentAgents,
        maxAgents: limits.maxConcurrentAgents,
      });

      const error = new Error('Maximum concurrent agent connections reached.');
      error.code = 'agent_concurrency_limit';
      error.statusCode = 403;
      error.details = {
        sessionId,
        tier: status.tier,
        currentValue: status.usage.concurrentAgents,
        limitValue: limits.maxConcurrentAgents,
      };
      throw error;
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
          auth_id: flowfexSessions.auth_id,
          anonymous_token: flowfexSessions.anonymous_token,
        })
        .from(flowfexSessions)
        .where(eq(flowfexSessions.id, sessionId))
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
