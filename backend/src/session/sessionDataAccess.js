import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../auth/betterAuth.js';
import { user } from '../db/schema.js';

export function isSessionDataConfigured() {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;
}

export function createSessionDataClient() {
  return db;
}

function normalizeResolvedUser(record, payload = {}) {
  if (!record && !payload) {
    return null;
  }

  const id = record?.id || payload.userId || payload.sub || payload.id || null;
  if (!id) {
    return null;
  }

  const name = record?.name || payload.name || null;
  const image = record?.image || payload.image || null;

  return {
    id,
    email: record?.email || payload.email || null,
    name,
    image,
    user_metadata: {
      full_name: name,
      name,
      avatar_url: image,
    },
  };
}

function extractBearerToken(input) {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return input.trim() || null;
  }

  if (typeof input.token === 'string' && input.token.trim()) {
    return input.token.trim();
  }

  const header = input.headers?.authorization || input.headers?.Authorization || '';
  if (typeof header !== 'string' || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return header.slice(7).trim() || null;
}

export async function resolveAuthenticatedUser(input) {
  if (input?.user?.id) {
    return normalizeResolvedUser(input.user, input.user);
  }

  if (input?.id && typeof input.id === 'string' && !input?.headers) {
    return normalizeResolvedUser(input, input);
  }

  const token = extractBearerToken(input);
  if (!token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      return null;
    }

    const payload = jwt.verify(token, secret);
    const userId = payload?.userId || payload?.sub || payload?.id || null;
    if (!userId) {
      return normalizeResolvedUser(null, payload);
    }

    const rows = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const record = Array.isArray(rows) ? rows[0] || null : rows || null;
    return normalizeResolvedUser(record, payload);
  } catch {
    return null;
  }
}
