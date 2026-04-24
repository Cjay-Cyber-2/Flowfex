import { createSessionDataClient } from './sessionDataAccess.js';
import { logSessionError } from './sessionLogger.js';

const FLOWFEX_LIMITS = {
  anonymous: {
    maxExecutionsPerSession: 3,
    maxNodesPerSession: 15,
    maxSessionDurationMinutes: 30,
    maxConcurrentAgents: 1,
  },
  authenticated: {
    maxExecutionsPerDay: 50,
    maxNodesPerDay: 500,
    maxSessionDurationMinutes: 480,
    maxConcurrentAgents: 5,
  },
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function sumUsageRows(rows) {
  return rows.reduce((accumulator, row) => ({
    executionsCount: accumulator.executionsCount + Number(row.executions_count || 0),
    nodesProcessed: accumulator.nodesProcessed + Number(row.nodes_processed || 0),
    sessionDurationSeconds: accumulator.sessionDurationSeconds + Number(row.session_duration_seconds || 0),
  }), {
    executionsCount: 0,
    nodesProcessed: 0,
    sessionDurationSeconds: 0,
  });
}

function buildBlockedLimit(tier, usage) {
  const limits = FLOWFEX_LIMITS[tier];

  if (tier === 'anonymous' && usage.executionsCount >= limits.maxExecutionsPerSession) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxExecutionsPerSession',
      reason: 'Anonymous sessions are limited to three executions before sign-up is required.',
      currentValue: usage.executionsCount,
      limitValue: limits.maxExecutionsPerSession,
    };
  }

  if (tier === 'authenticated' && usage.executionsCount >= limits.maxExecutionsPerDay) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxExecutionsPerDay',
      reason: 'This account has reached the 24-hour execution allowance.',
      currentValue: usage.executionsCount,
      limitValue: limits.maxExecutionsPerDay,
    };
  }

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

  if (tier === 'authenticated' && usage.nodesProcessed >= limits.maxNodesPerDay) {
    return {
      status: 'blocked',
      tier,
      limit: 'maxNodesPerDay',
      reason: 'This account has reached the 24-hour processed-node allowance.',
      currentValue: usage.nodesProcessed,
      limitValue: limits.maxNodesPerDay,
    };
  }

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

function createLimitError(status, sessionId) {
  const error = new Error(status.blockedLimit?.reason || 'Usage limit reached.');
  error.code = 'limit_reached';
  error.statusCode = 403;
  error.details = {
    sessionId,
    tier: status.tier,
    blockedLimit: status.blockedLimit,
  };
  return error;
}

export class UsageService {
  constructor(config = {}) {
    this.client = config.client || createSessionDataClient();
  }

  async getUsageStatus({ sessionId }) {
    if (!sessionId) {
      return null;
    }

    try {
      const { data: sessionRow, error: sessionError } = await this.client
        .from('sessions')
        .select('id, auth_id, anonymous_token, connected_agents, created_at')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      const session = firstRow(sessionRow);
      if (!session) {
        return null;
      }

      const tier = session.auth_id ? 'authenticated' : 'anonymous';
      const nowMs = Date.now();
      const rollingWindowStartIso = new Date(nowMs - ONE_DAY_MS).toISOString();

      const usageQuery = this.client
        .from('usage_tracking')
        .select('executions_count, nodes_processed, session_duration_seconds, period_start, created_at');

      if (tier === 'authenticated') {
        usageQuery.eq('auth_id', session.auth_id).gte('period_start', rollingWindowStartIso);
      } else {
        usageQuery.eq('session_id', sessionId);
      }

      const { data: usageRows, error: usageError } = await usageQuery;
      if (usageError) {
        throw usageError;
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
        if (Number.isNaN(rowMs)) {
          return lowest;
        }

        if (lowest === null || rowMs < lowest) {
          return rowMs;
        }

        return lowest;
      }, null) ?? createdAtMs;
      const resetWindowMs = tier === 'authenticated'
        ? ONE_DAY_MS
        : FLOWFEX_LIMITS.anonymous.maxSessionDurationMinutes * 60 * 1000;

      return {
        ok: true,
        tier,
        sessionId,
        authId: session.auth_id || null,
        anonymousToken: session.anonymous_token || null,
        usage,
        limits: FLOWFEX_LIMITS[tier],
        blockedLimit: buildBlockedLimit(tier, usage),
        resetAt: Number.isNaN(resetBaseMs)
          ? null
          : new Date(resetBaseMs + resetWindowMs).toISOString(),
      };
    } catch (error) {
      logSessionError({
        operation: 'usage.get_status',
        sessionId,
        error,
      });
      throw error;
    }
  }

  async assertExecutionAllowed({ sessionId }) {
    const status = await this.getUsageStatus({ sessionId });
    if (status?.blockedLimit) {
      throw createLimitError(status, sessionId);
    }

    return status;
  }

  async recordExecution({ sessionId, nodesProcessed = 0 }) {
    if (!sessionId) {
      return null;
    }

    try {
      const { data: sessionRow, error: sessionError } = await this.client
        .from('sessions')
        .select('auth_id, anonymous_token')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      const session = firstRow(sessionRow);
      const { data, error } = await this.client.rpc('increment_usage_tracking', {
        p_session_id: sessionId,
        p_auth_id: session?.auth_id || null,
        p_anonymous_token: session?.anonymous_token || null,
        p_executions_increment: 1,
        p_nodes_processed_increment: Math.max(0, Number(nodesProcessed) || 0),
        p_duration_seconds_increment: 0,
      });

      if (error) {
        throw error;
      }

      return firstRow(data);
    } catch (error) {
      logSessionError({
        operation: 'usage.record_execution',
        sessionId,
        error,
      });
      throw error;
    }
  }
}
