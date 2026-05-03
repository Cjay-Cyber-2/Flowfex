import { db } from '../auth/betterAuth.js';

export function isSessionDataConfigured() {
  return !!process.env.DATABASE_URL;
}

export function createSessionDataClient() {
  return db;
}

export async function resolveAuthenticatedUser(request) {
  if (request && request.user) {
    return request.user;
  }
  return null;
}
