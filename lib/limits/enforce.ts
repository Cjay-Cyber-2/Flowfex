import { FLOWFEX_LIMITS } from './config';

export type FlowfexUsageTier = keyof typeof FLOWFEX_LIMITS;

export type FlowfexLimitKey =
  | 'maxConnectionsPerDay'
  | 'maxExecutionsPerSession'
  | 'maxNodesPerSession'
  | 'maxExecutionsPerDay'
  | 'maxNodesPerDay'
  | 'maxSessionDurationMinutes'
  | 'maxConcurrentAgents';

export interface FlowfexUsageSnapshot {
  readonly connectionsCount: number;
  readonly executionsCount: number;
  readonly nodesProcessed: number;
  readonly sessionDurationSeconds: number;
  readonly concurrentAgents: number;
}

export interface FlowfexAllowedLimitResult {
  readonly status: 'allowed';
  readonly tier: FlowfexUsageTier;
}

export interface FlowfexBlockedLimitResult {
  readonly status: 'blocked';
  readonly tier: FlowfexUsageTier;
  readonly limit: FlowfexLimitKey;
  readonly reason: string;
  readonly currentValue: number;
  readonly limitValue: number;
}

export type FlowfexLimitResult = FlowfexAllowedLimitResult | FlowfexBlockedLimitResult;

function block(
  tier: FlowfexUsageTier,
  limit: FlowfexLimitKey,
  currentValue: number,
  limitValue: number,
  reason: string
): FlowfexBlockedLimitResult {
  return {
    status: 'blocked',
    tier,
    limit,
    reason,
    currentValue,
    limitValue,
  };
}

export function resolveUsageTier(isAuthenticated: boolean): FlowfexUsageTier {
  return isAuthenticated ? 'authenticated' : 'anonymous';
}

export function enforceUsageLimits(
  tier: FlowfexUsageTier,
  usage: FlowfexUsageSnapshot
): FlowfexLimitResult {
  const limits = FLOWFEX_LIMITS[tier];

  if (usage.connectionsCount >= limits.maxConnectionsPerDay) {
    return block(
      tier,
      'maxConnectionsPerDay',
      usage.connectionsCount,
      limits.maxConnectionsPerDay,
      tier === 'anonymous'
        ? 'Anonymous sessions are limited to twenty verified agent attaches per day.'
        : 'Authenticated sessions are limited to twenty verified agent attaches per day.'
    );
  }

  if ('maxExecutionsPerSession' in limits && usage.executionsCount >= limits.maxExecutionsPerSession) {
    return block(
      tier,
      'maxExecutionsPerSession',
      usage.executionsCount,
      limits.maxExecutionsPerSession,
      `Your anonymous Flowfex session has used all ${limits.maxExecutionsPerSession} free requests for today. Sign up to keep going, or wait until the daily reset.`
    );
  }

  if ('maxExecutionsPerDay' in limits && usage.executionsCount >= limits.maxExecutionsPerDay) {
    return block(
      tier,
      'maxExecutionsPerDay',
      usage.executionsCount,
      limits.maxExecutionsPerDay,
      'You have reached the 24-hour Flowfex request allowance for this account.'
    );
  }

  if ('maxNodesPerSession' in limits && usage.nodesProcessed >= limits.maxNodesPerSession) {
    return block(
      tier,
      'maxNodesPerSession',
      usage.nodesProcessed,
      limits.maxNodesPerSession,
      'Anonymous sessions are limited to fifteen processed nodes.'
    );
  }

  if ('maxNodesPerDay' in limits && usage.nodesProcessed >= limits.maxNodesPerDay) {
    return block(
      tier,
      'maxNodesPerDay',
      usage.nodesProcessed,
      limits.maxNodesPerDay,
      'Authenticated users are limited to five hundred processed nodes per day.'
    );
  }

  const durationMinutes = usage.sessionDurationSeconds / 60;
  if (durationMinutes >= limits.maxSessionDurationMinutes) {
    return block(
      tier,
      'maxSessionDurationMinutes',
      Math.floor(durationMinutes),
      limits.maxSessionDurationMinutes,
      'The current session has reached its allowed duration.'
    );
  }

  if (usage.concurrentAgents >= limits.maxConcurrentAgents) {
    return block(
      tier,
      'maxConcurrentAgents',
      usage.concurrentAgents,
      limits.maxConcurrentAgents,
      'The maximum number of concurrent connected agents has been reached.'
    );
  }

  return {
    status: 'allowed',
    tier,
  };
}
