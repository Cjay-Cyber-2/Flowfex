import type { SyniqAnonymousSessionResponse } from '../../packages/types/session';

export const SYNIQ_ANONYMOUS_TOKEN_STORAGE_KEY = 'syniq_anonymous_token';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SessionRequestOptions {
  readonly apiBaseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly storage?: StorageLike | null;
}

export interface SyniqInitializedSession {
  readonly anonymousToken: string | null;
  readonly session: SyniqAnonymousSessionResponse['session'];
}

export interface SyniqRecentSessionResponse {
  readonly ok: boolean;
  readonly session: SyniqAnonymousSessionResponse['session'];
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

function getDefaultStorage(storage?: StorageLike | null): StorageLike | null {
  if (typeof storage !== 'undefined') {
    return storage;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
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
    throw new Error(message || `Syniq session request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function readAnonymousToken(storage?: StorageLike | null): string | null {
  return getDefaultStorage(storage)?.getItem(SYNIQ_ANONYMOUS_TOKEN_STORAGE_KEY) ?? null;
}

export function writeAnonymousToken(token: string | null, storage?: StorageLike | null): void {
  const resolvedStorage = getDefaultStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  if (token) {
    resolvedStorage.setItem(SYNIQ_ANONYMOUS_TOKEN_STORAGE_KEY, token);
    return;
  }

  resolvedStorage.removeItem(SYNIQ_ANONYMOUS_TOKEN_STORAGE_KEY);
}

export async function createAnonymousSession(
  options: SessionRequestOptions & { forceNew?: boolean } = {}
): Promise<SyniqAnonymousSessionResponse> {
  const response = await requestJson<SyniqAnonymousSessionResponse>(
    '/api/session/create-anonymous',
    {
      method: 'POST',
      body: JSON.stringify({
        forceNew: options.forceNew === true,
      }),
    },
    options
  );
  writeAnonymousToken(response.anonymousToken, options.storage);
  return response;
}

/**
 * Mint a fresh anonymous workspace session (new SESSION_ID and token).
 * Use when the prior workspace hit maxSessionDurationMinutes or attach limits.
 */
export async function rotateAnonymousWorkspaceSession(
  options: SessionRequestOptions = {}
): Promise<SyniqAnonymousSessionResponse> {
  writeAnonymousToken(null, options.storage);
  return createAnonymousSession({
    ...options,
    forceNew: true,
  });
}

export async function validateAnonymousSession(
  anonymousToken: string,
  options: SessionRequestOptions = {}
): Promise<SyniqAnonymousSessionResponse> {
  return requestJson<SyniqAnonymousSessionResponse>(
    '/api/session/validate-anonymous',
    {
      method: 'POST',
      body: JSON.stringify({
        anonymousToken,
      }),
    },
    options
  );
}

export async function fetchRecentAuthenticatedSession(
  accessToken: string,
  options: SessionRequestOptions = {}
): Promise<SyniqRecentSessionResponse> {
  return requestJson<SyniqRecentSessionResponse>(
    '/api/session/recent',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    options
  );
}

export async function initializeSyniqSession(
  options: SessionRequestOptions = {}
): Promise<SyniqInitializedSession> {
  const storedToken = readAnonymousToken(options.storage);

  if (storedToken) {
    try {
      const existing = await validateAnonymousSession(storedToken, options);
      return {
        anonymousToken: storedToken,
        session: existing.session,
      };
    } catch {
      writeAnonymousToken(null, options.storage);
    }
  }

  const created = await createAnonymousSession(options);
  return {
    anonymousToken: created.anonymousToken,
    session: created.session,
  };
}
