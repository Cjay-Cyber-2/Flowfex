const DEFAULT_APP_ORIGIN = 'http://localhost:3000';
const DEFAULT_BACKEND_ORIGIN = 'http://localhost:4000';
const DEFAULT_VERCEL_PRODUCTION_BACKEND = 'https://flowfex.onrender.com';
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

/** Origin + port only — Better Auth client appends `/api/auth` only when baseURL has no path. */
function toHttpOrigin(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
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
    return toHttpOrigin(configuredOrigin) || configuredOrigin;
  }

  return DEFAULT_APP_ORIGIN;
}

const VERCEL_APP_HOSTS = new Set(['syniq.vercel.app', 'flowfex.vercel.app']);

function isLocalDevHost(hostname) {
  return LOCAL_HOSTNAMES.has(hostname);
}

function isVercelAppHost(hostname) {
  return VERCEL_APP_HOSTS.has(hostname);
}

/**
 * Base URL for browser `fetch()` calls.
 * Prefer same-origin paths so Vite (dev) or Vercel rewrites proxy to the API — avoids
 * cross-origin failures that surface as "NetworkError when attempting to fetch resource".
 */
export function resolveApiFetchBase() {
  const location = getBrowserLocation();

  if (import.meta.env.DEV && location && isLocalDevHost(location.hostname)) {
    return '';
  }

  if (location && isVercelAppHost(location.hostname)) {
    return '';
  }

  const rawEnv = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  const configuredOrigin = normalizeOrigin(rawEnv);
  if (configuredOrigin) {
    return (toHttpOrigin(configuredOrigin) || configuredOrigin).replace(/\/+$/, '');
  }

  return getBackendOrigin().replace(/\/+$/, '');
}

/**
 * Public API origin for prompts, sockets, and absolute URLs shown to agents.
 */
export function getBackendOrigin() {
  const rawEnv = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  const configuredOrigin = normalizeOrigin(rawEnv);
  if (configuredOrigin) {
    return toHttpOrigin(configuredOrigin) || configuredOrigin;
  }

  const location = getBrowserLocation();
  if (!location) {
    return DEFAULT_BACKEND_ORIGIN;
  }

  if (isVercelAppHost(location.hostname)) {
    return DEFAULT_VERCEL_PRODUCTION_BACKEND;
  }

  if (isLocalDevHost(location.hostname)) {
    if (location.port === '3000' || location.port === '5173') {
      return `${location.protocol}//${location.hostname}:4000`;
    }
    return DEFAULT_BACKEND_ORIGIN;
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

  try {
    // If it's a valid absolute URL (like the one returned from the backend), preserve it!
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    // If it's a relative path, resolve it against the backend origin
    if (value.startsWith('/connect/live/')) {
      return new URL(value, getBackendOrigin()).toString();
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
