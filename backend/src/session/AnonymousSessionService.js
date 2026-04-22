import { createHash, randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from './supabaseAdmin.js';
import { logSessionError } from './sessionLogger.js';
import { toDashboardSessionRecord } from './sessionSerializers.js';

function firstResult(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

function buildAnonymousToken() {
  const timestampHash = createHash('sha256')
    .update(`${Date.now()}:${randomUUID()}`)
    .digest('hex')
    .slice(0, 16);

  return `${randomUUID()}_${timestampHash}`;
}

export class AnonymousSessionService {
  constructor(config = {}) {
    this.client = config.client || createSupabaseAdminClient();
  }

  async createAnonymousSession() {
    const anonymousToken = buildAnonymousToken();

    try {
      const { data, error } = await this.client.rpc('create_anonymous_session', {
        p_anonymous_token: anonymousToken,
        p_mode: 'live',
      });

      if (error) {
        throw error;
      }

      const row = firstResult(data);

      return {
        sessionId: row?.session_id || null,
        anonymousToken: row?.anonymous_token || anonymousToken,
      };
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.create',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async validateAnonymousSession(anonymousToken) {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('anonymous_token', anonymousToken)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toDashboardSessionRecord(data) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.validate',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async upgradeAnonymousSession({ anonymousToken, authId, displayName = null, avatarUrl = null }) {
    try {
      const { data, error } = await this.client.rpc('upgrade_anonymous_session', {
        p_anonymous_token: anonymousToken,
        p_auth_id: authId,
        p_display_name: displayName,
        p_avatar_url: avatarUrl,
      });

      if (error) {
        throw error;
      }

      const row = firstResult(data);

      return row ? toDashboardSessionRecord(row) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.upgrade',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async getMostRecentSessionForUser(authId) {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('auth_id', authId)
        .order('last_active_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toDashboardSessionRecord(data) : null;
    } catch (error) {
      logSessionError({
        operation: 'anonymous_session.get_most_recent_for_user',
        sessionId: null,
        error,
      });
      throw error;
    }
  }
}
