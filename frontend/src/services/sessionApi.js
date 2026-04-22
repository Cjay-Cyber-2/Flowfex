import { getBackendOrigin } from '../utils/runtimeConfig';

export const ANONYMOUS_TOKEN_STORAGE_KEY = 'flowfex_anonymous_token';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request(path, options = {}) {
  const response = await fetch(`${getBackendOrigin()}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Flowfex session request failed.');
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function createAnonymousSession() {
  return request('/api/session/create-anonymous', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function validateAnonymousSession(anonymousToken) {
  return request('/api/session/validate-anonymous', {
    method: 'POST',
    body: JSON.stringify({ anonymousToken }),
  });
}

export async function upgradeAnonymousSession(accessToken, anonymousToken) {
  return request('/api/session/upgrade', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ anonymousToken }),
  });
}

export async function fetchRecentSession(accessToken) {
  return request('/api/session/recent', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function listApiKeys(accessToken) {
  return request('/api/api-keys', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function generateApiKey(accessToken, label) {
  return request('/api/api-keys', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ label }),
  });
}

export async function revokeApiKey(accessToken, keyId) {
  return request(`/api/api-keys/${encodeURIComponent(keyId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
