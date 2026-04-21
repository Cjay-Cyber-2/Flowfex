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
  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_APP_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const location = getBrowserLocation();
  if (location) {
    return location.origin;
  }

  return DEFAULT_APP_ORIGIN;
}

export function getBackendOrigin() {
  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_BACKEND_URL);
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
  return new URL(`/connect/live/${encodeURIComponent(sessionId)}`, `${getAppOrigin()}/`).toString();
}

export function getSessionSocketUrl(sessionId) {
  const url = new URL(`/ws/${encodeURIComponent(sessionId)}`, `${getBackendOrigin()}/`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
