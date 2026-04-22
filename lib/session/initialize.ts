import type { FlowfexAnonymousSessionResponse } from '../../packages/types/session';

export const FLOWFEX_ANONYMOUS_TOKEN_STORAGE_KEY = 'flowfex_anonymous_token';

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

export interface FlowfexInitializedSession {
  readonly anonymousToken: string | null;
  readonly session: FlowfexAnonymousSessionResponse['session'];
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
    throw new Error(message || `Flowfex session request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function readAnonymousToken(storage?: StorageLike | null): string | null {
  return getDefaultStorage(storage)?.getItem(FLOWFEX_ANONYMOUS_TOKEN_STORAGE_KEY) ?? null;
}

export function writeAnonymousToken(token: string | null, storage?: StorageLike | null): void {
  const resolvedStorage = getDefaultStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  if (token) {
    resolvedStorage.setItem(FLOWFEX_ANONYMOUS_TOKEN_STORAGE_KEY, token);
    return;
  }

  resolvedStorage.removeItem(FLOWFEX_ANONYMOUS_TOKEN_STORAGE_KEY);
}

export async function createAnonymousSession(
  options: SessionRequestOptions = {}
): Promise<FlowfexAnonymousSessionResponse> {
  const response = await requestJson<FlowfexAnonymousSessionResponse>(
    '/api/session/create-anonymous',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    options
  );
  writeAnonymousToken(response.anonymousToken, options.storage);
  return response;
}

export async function validateAnonymousSession(
  anonymousToken: string,
  options: SessionRequestOptions = {}
): Promise<FlowfexAnonymousSessionResponse> {
  return requestJson<FlowfexAnonymousSessionResponse>(
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

export async function initializeFlowfexSession(
  options: SessionRequestOptions = {}
): Promise<FlowfexInitializedSession> {
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
