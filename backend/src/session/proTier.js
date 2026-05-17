/**
 * Optional comma-separated Better Auth user ids that receive the `pro` usage tier.
 * Set in deployment: SYNIQ_PRO_AUTH_IDS=userId1,userId2
 */
export function parseProAuthIdSet() {
  const raw = process.env.SYNIQ_PRO_AUTH_IDS || '';
  return new Set(
    String(raw)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

export function isProAuthId(authId) {
  if (!authId) {
    return false;
  }
  return parseProAuthIdSet().has(String(authId));
}
