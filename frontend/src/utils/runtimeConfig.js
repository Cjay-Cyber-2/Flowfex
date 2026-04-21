const DEFAULT_APP_ORIGIN = 'http://localhost:3000';
const DEFAULT_BACKEND_ORIGIN = 'http://localhost:4000';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizeOrigin(value) {
  if (!value) {
    return null;
  }

  try {
    return trimTrailingSlash(new URL(value).toString());
  } catch {
    return trimTrailingSlash(value);
  }
}

function getBrowserLocation() {
  return typeof window === 'undefined' ? null : window.location;
}

export function getAppOrigin() {
  const location = getBrowserLocation();
  if (location?.origin) {
    return location.origin;
  }

  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_APP_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  return DEFAULT_APP_ORIGIN;
}

export function getBackendOrigin() {
  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const location = getBrowserLocation();
  if (!location) {
    return DEFAULT_BACKEND_ORIGIN;
  }

  if (LOCAL_HOSTNAMES.has(location.hostname) && location.port === '3000') {
    return `${location.protocol}//${location.hostname}:4000`;
  }

  return location.origin;
}

export function getSessionConnectUrl(sessionId) {
  return new URL(`/connect/live/${encodeURIComponent(sessionId)}`, `${getBackendOrigin()}/`).toString();
}

export function normalizeSessionConnectUrl(value) {
  if (!value) {
    return '';
  }

  const location = getBrowserLocation();
  if (!location?.origin) {
    return trimTrailingSlash(value);
  }

  try {
    const parsed = new URL(value, location.origin);
    if (parsed.pathname.startsWith('/connect/live/')) {
      return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, location.origin).toString();
    }

    return parsed.toString();
  } catch {
    if (value.startsWith('/connect/live/')) {
      return new URL(value, location.origin).toString();
    }

    return trimTrailingSlash(value);
  }
}

export function rewriteConnectPrompt(prompt, sessionUrl) {
  if (!prompt) {
    return '';
  }

  const normalizedSessionUrl = normalizeSessionConnectUrl(sessionUrl);
  if (!normalizedSessionUrl) {
    return prompt;
  }

  return prompt.replace(/(^Session URL:\s*).+$/m, `$1${normalizedSessionUrl}`);
}

export function getSessionSocketUrl(sessionId) {
  const url = new URL(`/ws/${encodeURIComponent(sessionId)}`, `${getBackendOrigin()}/`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
