import { createHash, randomBytes } from 'node:crypto';
import { createSupabaseAdminClient } from './supabaseAdmin.js';
import { logSessionError } from './sessionLogger.js';

function hashApiKey(rawKey) {
  return createHash('sha256').update(rawKey).digest('hex');
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

export class ApiKeyService {
  constructor(config = {}) {
    this.client = config.client || createSupabaseAdminClient();
  }

  async generateApiKey(authId, label) {
    const secret = randomBytes(32).toString('base64url');
    const rawKey = `fx_live_${secret}`;
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    try {
      const { data, error } = await this.client
        .from('api_keys')
        .insert({
          auth_id: authId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          label,
        })
        .select('id, key_prefix, label, created_at, is_active, last_used_at')
        .single();

      if (error) {
        throw error;
      }

      return {
        key: rawKey,
        record: data,
      };
    } catch (error) {
      logSessionError({
        operation: 'api_key.generate',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async listApiKeys(authId) {
    try {
      const { data, error } = await this.client
        .from('api_keys')
        .select('id, key_prefix, label, created_at, is_active, last_used_at')
        .eq('auth_id', authId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      logSessionError({
        operation: 'api_key.list',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async revokeApiKey(authId, keyId) {
    try {
      const { data, error } = await this.client
        .from('api_keys')
        .update({ is_active: false })
        .eq('auth_id', authId)
        .eq('id', keyId)
        .select('id, key_prefix, label, created_at, is_active, last_used_at')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logSessionError({
        operation: 'api_key.revoke',
        sessionId: null,
        error,
      });
      throw error;
    }
  }

  async validateApiKey(rawKey) {
    if (typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      return null;
    }

    try {
      const keyHash = hashApiKey(rawKey);
      const { data, error } = await this.client
        .from('api_keys')
        .select('id, auth_id, key_prefix, label, is_active, created_at')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const row = firstRow(data);
      if (!row) {
        return null;
      }

      await this.client
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', row.id);

      return {
        authId: row.auth_id,
        keyId: row.id,
        label: row.label,
        keyPrefix: row.key_prefix,
      };
    } catch (error) {
      logSessionError({
        operation: 'api_key.validate',
        sessionId: null,
        error,
      });
      throw error;
    }
  }
}
