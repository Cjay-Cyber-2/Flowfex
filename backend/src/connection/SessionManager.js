import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 60 * 30;
const MAX_TTL_SECONDS = 60 * 60 * 24;

/**
 * In-memory session manager for external agent connections.
 * Stores only token hashes and enforces expiry on every access.
 */
export class SessionManager {
  constructor(config = {}) {
    this.sessions = new Map();
    this.defaultTtlSeconds = config.defaultTtlSeconds || DEFAULT_TTL_SECONDS;
    this.maxTtlSeconds = config.maxTtlSeconds || MAX_TTL_SECONDS;
    this.minimumTtlSeconds = config.minimumTtlSeconds || 60;
  }

  createSession(config = {}) {
    this.cleanupExpiredSessions();

    const now = Date.now();
    const ttlSeconds = clamp(
      config.ttlSeconds || this.defaultTtlSeconds,
      this.minimumTtlSeconds,
      this.maxTtlSeconds
    );
    const id = `sess_${randomBytes(12).toString('hex')}`;
    const token = `ffx_${randomBytes(24).toString('hex')}`;
    const session = {
      id,
      mode: config.mode || 'api',
      agent: normalizeAgent(config.agent),
      metadata: config.metadata || {},
      prompt: config.prompt || null,
      capabilities: Array.isArray(config.capabilities) ? config.capabilities : [],
      allowedToolIds: normalizeToolIds(config.allowedToolIds),
      recommendedToolIds: normalizeToolIds(config.recommendedToolIds),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
      lastSeenAt: new Date(now).toISOString(),
      requestCount: 0,
      revokedAt: null,
      tokenHash: hashToken(token)
    };

    this.sessions.set(id, session);

    return {
      session: cloneSession(session),
      token
    };
  }

  authenticate(sessionId, token) {
    this.cleanupExpiredSessions();
    const session = this.sessions.get(sessionId);

    if (!session || session.revokedAt) {
      throw createSessionError('Session not found or no longer active', 401);
    }

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw createSessionError('Missing session token', 401);
    }

    if (!matchesToken(session.tokenHash, token)) {
      throw createSessionError('Invalid session token', 401);
    }

    session.requestCount += 1;
    session.lastSeenAt = new Date().toISOString();

    return cloneSession(session);
  }

  findSessionByToken(token, options = {}) {
    this.cleanupExpiredSessions();

    if (typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    for (const session of this.sessions.values()) {
      if (session.revokedAt || !matchesToken(session.tokenHash, token)) {
        continue;
      }

      if (options.touch === true) {
        session.requestCount += 1;
        session.lastSeenAt = new Date().toISOString();
      }

      return cloneSession(session);
    }

    return null;
  }

  getSession(sessionId) {
    this.cleanupExpiredSessions();
    const session = this.sessions.get(sessionId);
    return session ? cloneSession(session) : null;
  }

  revokeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.revokedAt = new Date().toISOString();
    return cloneSession(session);
  }

  cleanupExpiredSessions() {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (Date.parse(session.expiresAt) <= now || session.revokedAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const defaultSessionManager = new SessionManager();

export function publicSessionView(session) {
  return {
    id: session.id,
    mode: session.mode,
    agent: session.agent,
    metadata: session.metadata,
    prompt: session.prompt,
    capabilities: session.capabilities,
    allowedToolIds: session.allowedToolIds,
    recommendedToolIds: session.recommendedToolIds,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    lastSeenAt: session.lastSeenAt,
    requestCount: session.requestCount,
    revokedAt: session.revokedAt
  };
}

function normalizeAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return {
      id: null,
      name: 'external-agent',
      type: 'unknown',
      version: null
    };
  }

  return {
    id: agent.id || null,
    name: agent.name || 'external-agent',
    type: agent.type || agent.kind || 'unknown',
    version: agent.version || null
  };
}

function normalizeToolIds(toolIds) {
  if (!Array.isArray(toolIds)) {
    return null;
  }

  return Array.from(new Set(toolIds.filter(Boolean)));
}

function cloneSession(session) {
  return {
    ...session,
    agent: session.agent ? { ...session.agent } : null,
    metadata: session.metadata ? { ...session.metadata } : {},
    capabilities: Array.isArray(session.capabilities) ? [...session.capabilities] : [],
    allowedToolIds: Array.isArray(session.allowedToolIds) ? [...session.allowedToolIds] : null,
    recommendedToolIds: Array.isArray(session.recommendedToolIds) ? [...session.recommendedToolIds] : null
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function matchesToken(storedHash, token) {
  const left = Buffer.from(storedHash, 'hex');
  const right = Buffer.from(hashToken(token), 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function createSessionError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
