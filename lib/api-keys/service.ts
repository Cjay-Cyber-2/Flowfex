import type {
  SyniqApiKeyGenerationResponse,
  SyniqApiKeyListResponse,
  SyniqApiKeyRevokeResponse,
} from '../../packages/types/session';

export interface SyniqApiKeyRequestOptions {
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

async function requestJson<T>(
  pathname: string,
  accessToken: string,
  init: RequestInit,
  options: SyniqApiKeyRequestOptions
): Promise<T> {
  const response = await getDefaultFetch(options.fetchImpl)(buildApiUrl(pathname, options.apiBaseUrl), {
    credentials: 'include',
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Syniq API key request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function listApiKeys(
  accessToken: string,
  options: SyniqApiKeyRequestOptions = {}
): Promise<SyniqApiKeyListResponse> {
  return requestJson<SyniqApiKeyListResponse>(
    '/api/api-keys',
    accessToken,
    {
      method: 'GET',
    },
    options
  );
}

export async function generateApiKey(
  accessToken: string,
  label: string,
  options: SyniqApiKeyRequestOptions = {}
): Promise<SyniqApiKeyGenerationResponse> {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) {
    throw new Error('API key label is required.');
  }

  return requestJson<SyniqApiKeyGenerationResponse>(
    '/api/api-keys',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        label: normalizedLabel,
      }),
    },
    options
  );
}

export async function revokeApiKey(
  accessToken: string,
  keyId: string,
  options: SyniqApiKeyRequestOptions = {}
): Promise<SyniqApiKeyRevokeResponse> {
  return requestJson<SyniqApiKeyRevokeResponse>(
    `/api/api-keys/${encodeURIComponent(keyId)}`,
    accessToken,
    {
      method: 'DELETE',
    },
    options
  );
}
