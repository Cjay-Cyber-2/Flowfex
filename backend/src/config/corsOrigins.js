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

function parseEnvOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => entry !== '*');
}

/**
 * Origins browsers may use when calling this API or opening a Socket.io connection.
 * @returns {string[]}
 */
export function getAllowedBrowserOrigins() {
  const parsed = parseEnvOrigins();
  return parsed.length > 0 ? parsed : [...DEFAULT_ORIGINS];
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
