export type FlowfexUsageTier = 'anonymous' | 'authenticated';

export type FlowfexLimitKey =
  | 'maxExecutionsPerSession'
  | 'maxNodesPerSession'
  | 'maxExecutionsPerDay'
  | 'maxNodesPerDay'
  | 'maxSessionDurationMinutes'
  | 'maxConcurrentAgents';

export interface FlowfexUsageSnapshot {
  readonly executionsCount: number;
  readonly nodesProcessed: number;
  readonly sessionDurationSeconds: number;
  readonly concurrentAgents: number;
}

export interface FlowfexBlockedLimitState {
  readonly status: 'blocked';
  readonly tier: FlowfexUsageTier;
  readonly limit: FlowfexLimitKey;
  readonly reason: string;
  readonly currentValue: number;
  readonly limitValue: number;
}

export interface FlowfexUsageLimits {
  readonly maxExecutionsPerSession?: number;
  readonly maxNodesPerSession?: number;
  readonly maxExecutionsPerDay?: number;
  readonly maxNodesPerDay?: number;
  readonly maxSessionDurationMinutes: number;
  readonly maxConcurrentAgents: number;
}

export interface FlowfexUsageStatusResponse {
  readonly ok: boolean;
  readonly tier: FlowfexUsageTier;
  readonly sessionId: string;
  readonly authId: string | null;
  readonly anonymousToken: string | null;
  readonly usage: FlowfexUsageSnapshot;
  readonly limits: FlowfexUsageLimits;
  readonly blockedLimit: FlowfexBlockedLimitState | null;
  readonly resetAt: string | null;
}

export interface FlowfexUsageRequestOptions {
  readonly apiBaseUrl?: string;
  readonly fetchImpl?: typeof fetch;
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

export async function fetchFlowfexUsageStatus(
  sessionId: string,
  accessToken: string | null,
  options: FlowfexUsageRequestOptions = {}
): Promise<FlowfexUsageStatusResponse> {
  const searchParams = new URLSearchParams({ sessionId });
  const response = await getDefaultFetch(options.fetchImpl)(
    buildApiUrl(`/api/session/usage?${searchParams.toString()}`, options.apiBaseUrl),
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Flowfex usage request failed with ${response.status}.`);
  }

  return response.json() as Promise<FlowfexUsageStatusResponse>;
}

export function getUsageProgressValue(status: FlowfexUsageStatusResponse): {
  readonly current: number;
  readonly limit: number;
  readonly ratio: number;
} {
  const current = status.tier === 'authenticated'
    ? status.usage.executionsCount
    : status.usage.executionsCount;
  const limit = status.tier === 'authenticated'
    ? status.limits.maxExecutionsPerDay ?? 0
    : status.limits.maxExecutionsPerSession ?? 0;
  const safeLimit = Math.max(limit, 1);

  return {
    current,
    limit: safeLimit,
    ratio: Math.min(1, current / safeLimit),
  };
}
