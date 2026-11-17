/**
 * Session token shape, in one place.
 *
 * Tokens are issued with ISSUED_PREFIX. LEGACY_PREFIXES stay accepted so
 * sessions and pasted connection blocks created before a prefix change keep
 * working — drop a legacy prefix only once every token carrying it has expired.
 */

export const ISSUED_TOKEN_PREFIX = 'syq_';
export const LEGACY_TOKEN_PREFIXES = ['ffx_'];

export const ACCEPTED_TOKEN_PREFIXES = [ISSUED_TOKEN_PREFIX, ...LEGACY_TOKEN_PREFIXES];

/** Alternation for embedding in a larger pattern, e.g. `(?:syq_|ffx_)[a-f0-9]+`. */
export const TOKEN_PREFIX_PATTERN = `(?:${ACCEPTED_TOKEN_PREFIXES.map(escapeRegExp).join('|')})`;

/** Matches a full token: an accepted prefix plus its hex body. */
export const TOKEN_PATTERN = `${TOKEN_PREFIX_PATTERN}[a-f0-9]+`;

export function isSessionToken(value) {
  return typeof value === 'string' && ACCEPTED_TOKEN_PREFIXES.some(prefix => value.startsWith(prefix));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
