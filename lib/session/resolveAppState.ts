import { readAnonymousToken, type StorageLike } from './initialize';

export interface FetchResolveAppStateOptions {
  readonly apiBaseUrl?: string;
  readonly accessToken: string | null;
  readonly fetchImpl?: typeof fetch;
  readonly storage?: StorageLike | null;
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

/**
 * Authoritative product snapshot from the Flowfex API (identity + workspace + usage + gates).
 * Call after session cookies/tokens are available; do not infer dashboard access from tokens alone.
 */
export async function fetchResolveAppState(options: FetchResolveAppStateOptions) {
  const headers: Record<string, string> = {};
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }
  const anon = readAnonymousToken(options.storage);
  if (anon) {
    headers['X-Flowfex-Anonymous-Token'] = anon;
  }

  const response = await getDefaultFetch(options.fetchImpl)(buildApiUrl('/api/session/resolve-state', options.apiBaseUrl), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.error?.message || `resolve-state failed (${response.status})`);
    (err as Error & { status?: number; payload?: unknown }).status = response.status;
    (err as Error & { status?: number; payload?: unknown }).payload = payload;
    throw err;
  }

  return payload;
}
