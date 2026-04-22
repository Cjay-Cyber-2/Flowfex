import type { FlowfexSessionUpgradeResponse } from '../../packages/types/session';
import {
  FLOWFEX_ANONYMOUS_TOKEN_STORAGE_KEY,
  type SessionRequestOptions,
  type StorageLike,
  readAnonymousToken,
  writeAnonymousToken,
} from './initialize';

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

async function requestJson<T>(
  pathname: string,
  init: RequestInit,
  options: SessionRequestOptions
): Promise<T> {
  const response = await getDefaultFetch(options.fetchImpl)(buildApiUrl(pathname, options.apiBaseUrl), {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Flowfex session upgrade failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export interface UpgradeAnonymousSessionOptions extends SessionRequestOptions {
  readonly storage?: StorageLike | null;
}

export async function upgradeAnonymousSession(
  accessToken: string,
  anonymousToken: string | null,
  options: UpgradeAnonymousSessionOptions = {}
): Promise<FlowfexSessionUpgradeResponse> {
  const resolvedToken = anonymousToken ?? readAnonymousToken(options.storage);
  if (!resolvedToken) {
    throw new Error(
      `Missing ${FLOWFEX_ANONYMOUS_TOKEN_STORAGE_KEY}; cannot upgrade the anonymous Flowfex session.`
    );
  }

  const response = await requestJson<FlowfexSessionUpgradeResponse>(
    '/api/session/upgrade',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        anonymousToken: resolvedToken,
      }),
    },
    options
  );

  writeAnonymousToken(null, options.storage);
  return response;
}
