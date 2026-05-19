/**
 * Central CORS allowlist for HTTP responses and Socket.io.
 * Trims entries, ignores bare "*" (unsafe with credentials), and falls back to
 * sensible defaults when ALLOWED_ORIGINS is unset so split deployments stay consistent.
 */

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://flowfex.vercel.app',
  'https://flowfex.onrender.com',
  'https://syniq.vercel.app',
  'https://syniq.onrender.com',
];

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const compact = value.trim().replace(/\s+/g, '');
  if (!compact || compact === '*') {
    return null;
  }

  const candidate = compact.includes('://')
    ? compact
    : compact.startsWith('localhost') || compact.startsWith('127.0.0.1')
      ? `http://${compact}`
      : `https://${compact}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function parseOriginList(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .map(normalizeOrigin)
    .filter(Boolean);
}

function collectEnvOriginCandidates() {
  return [
    process.env.FLOWFEX_APP_URL,
    process.env.SYNIQ_APP_URL,
    process.env.FRONTEND_URL,
    process.env.FRONTEND_ORIGIN,
    process.env.APP_URL,
    process.env.VITE_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.FLOWFEX_PUBLIC_ORIGIN,
    process.env.SYNIQ_PUBLIC_ORIGIN,
    process.env.RENDER_EXTERNAL_URL,
  ]
    .map(normalizeOrigin)
    .filter(Boolean);
}

/**
 * Origins browsers may use when calling this API or opening a Socket.io connection.
 * @returns {string[]}
 */
export function getAllowedBrowserOrigins() {
  const origins = new Set(DEFAULT_ORIGINS.map(normalizeOrigin).filter(Boolean));
  for (const origin of parseOriginList(process.env.ALLOWED_ORIGINS)) {
    origins.add(origin);
  }
  for (const origin of collectEnvOriginCandidates()) {
    origins.add(origin);
  }
  return Array.from(origins);
}

/**
 * Reflects the request Origin only when it is explicitly whitelisted (required when
 * Access-Control-Allow-Credentials is true).
 * @param {string|undefined} requestOrigin
 * @returns {string|null}
 */
export function resolveAllowedCorsOrigin(requestOrigin) {
  if (!requestOrigin || typeof requestOrigin !== 'string') {
    return null;
  }

  const allowed = getAllowedBrowserOrigins();
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}
