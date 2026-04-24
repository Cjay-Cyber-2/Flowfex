export function isSessionDataConfigured() {
  return false;
}

export function createSessionDataClient() {
  throw new Error(
    'Database-backed session services are not configured yet. Complete the Neon migration to enable them.'
  );
}

export async function resolveAuthenticatedUser() {
  return null;
}
