export type SyniqUsageTier = 'anonymous' | 'authenticated';

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

export interface SyniqBlockedLimitState {
  readonly status: 'blocked';
  readonly tier: SyniqUsageTier;
  readonly limit: SyniqLimitKey;
  readonly reason: string;
  readonly currentValue: number;
  readonly limitValue: number;
}

export interface SyniqUsageLimits {
  readonly maxConnectionsPerDay: number;
  readonly maxExecutionsPerSession?: number;
  readonly maxNodesPerSession?: number;
  readonly maxExecutionsPerDay?: number;
  readonly maxNodesPerDay?: number;
  readonly maxSessionDurationMinutes: number;
  readonly maxConcurrentAgents: number;
}

export interface SyniqUsageStatusResponse {
  readonly ok: boolean;
  readonly tier: SyniqUsageTier;
  readonly sessionId: string;
  readonly authId: string | null;
  readonly anonymousToken: string | null;
  readonly usage: SyniqUsageSnapshot;
  readonly limits: SyniqUsageLimits;
  readonly blockedLimit: SyniqBlockedLimitState | null;
  readonly connectionBlockedLimit: SyniqBlockedLimitState | null;
  readonly warningLimit?: {
    readonly status: 'approaching';
    readonly tier: SyniqUsageTier;
    readonly limit: SyniqLimitKey;
    readonly reason: string;
    readonly currentValue: number;
    readonly limitValue: number;
    readonly percentUsed: number;
  } | null;
  readonly resetAt: string | null;
}

export interface SyniqUsageRequestOptions {
  readonly apiBaseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly anonymousToken?: string | null;
}

function getDefaultFetch(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof fetch === 'undefined') {
    throw new Error('Fetch is not available in the current runtime.');
  }

  return fetch.bind(globalThis);
}

function buildApiUrl(pathname: string, apiBaseUrl?: string): string {
  const normalizedBaseUrl = apiBaseUrl?.trim() ?? '';
  if (!normalizedBaseUrl) {
    return pathname;
  }

  return `${normalizedBaseUrl.replace(/\/+$/, '')}${pathname}`;
}

export async function fetchSyniqUsageStatus(
  sessionId: string,
  accessToken: string | null,
  options: SyniqUsageRequestOptions = {}
): Promise<SyniqUsageStatusResponse> {
  const searchParams = new URLSearchParams({ sessionId });
  const response = await getDefaultFetch(options.fetchImpl)(
    buildApiUrl(`/api/session/usage?${searchParams.toString()}`, options.apiBaseUrl),
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.anonymousToken ? { 'X-Syniq-Anonymous-Token': options.anonymousToken } : {}),
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Syniq usage request failed with ${response.status}.`);
  }

  return response.json() as Promise<SyniqUsageStatusResponse>;
}

export function getUsageProgressValue(status: SyniqUsageStatusResponse): {
  readonly current: number;
  readonly limit: number;
  readonly ratio: number;
} {
  const current = status.usage.executionsCount;
  const limit = status.limits.maxExecutionsPerSession
    ?? status.limits.maxExecutionsPerDay
    ?? 0;
  const safeLimit = Math.max(limit, 1);

  return {
    current,
    limit: safeLimit,
    ratio: Math.min(1, current / safeLimit),
  };
}
