import { SYNIQ_LIMITS } from './config';

export type SyniqUsageTier = keyof typeof SYNIQ_LIMITS;

export type SyniqLimitKey =
  | 'maxConnectionsPerDay'
  | 'maxExecutionsPerSession'
  | 'maxNodesPerSession'
  | 'maxExecutionsPerDay'
  | 'maxNodesPerDay'
  | 'maxSessionDurationMinutes'
  | 'maxConcurrentAgents';

export interface SyniqUsageSnapshot {
  readonly connectionsCount: number;
  readonly executionsCount: number;
  readonly nodesProcessed: number;
  readonly sessionDurationSeconds: number;
  readonly concurrentAgents: number;
}

export interface SyniqAllowedLimitResult {
  readonly status: 'allowed';
  readonly tier: SyniqUsageTier;
}

export interface SyniqBlockedLimitResult {
  readonly status: 'blocked';
  readonly tier: SyniqUsageTier;
  readonly limit: SyniqLimitKey;
  readonly reason: string;
  readonly currentValue: number;
  readonly limitValue: number;
}

export type SyniqLimitResult = SyniqAllowedLimitResult | SyniqBlockedLimitResult;

function block(
  tier: SyniqUsageTier,
  limit: SyniqLimitKey,
  currentValue: number,
  limitValue: number,
  reason: string
): SyniqBlockedLimitResult {
  return {
    status: 'blocked',
    tier,
    limit,
    reason,
    currentValue,
    limitValue,
  };
}

export function resolveUsageTier(isAuthenticated: boolean): SyniqUsageTier {
  return isAuthenticated ? 'authenticated' : 'anonymous';
}

export function enforceUsageLimits(
  tier: SyniqUsageTier,
  usage: SyniqUsageSnapshot
): SyniqLimitResult {
  const limits = SYNIQ_LIMITS[tier];

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
      `Your connected agent has used all ${limits.maxExecutionsPerSession} free Syniq skill or tool requests for today. Sign up to keep going, or wait until the daily reset.`
    );
  }

  if ('maxExecutionsPerDay' in limits && usage.executionsCount >= limits.maxExecutionsPerDay) {
    return block(
      tier,
      'maxExecutionsPerDay',
      usage.executionsCount,
      limits.maxExecutionsPerDay,
      'You have reached the 24-hour Syniq skill and tool request allowance for this account.'
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
