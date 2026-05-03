import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createSessionDataClient } from './sessionDataAccess.js';
import { logSessionError } from './sessionLogger.js';
import { apiKeys } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

function hashApiKey(rawKey) {
  return createHash('sha256').update(rawKey).digest('hex');
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] || null : data || null;
}

export class ApiKeyService {
  constructor(config = {}) {
    this.client = config.client || createSessionDataClient();
  }

  async generateApiKey(authId, label) {
    const secret = randomBytes(32).toString('base64url');
    const rawKey = `fx_live_${secret}`;
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);
    const keyId = randomUUID();

    try {
      const data = await this.client.insert(apiKeys).values({
        id: keyId,
        auth_id: authId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        label,
      }).returning({
        id: apiKeys.id,
        key_prefix: apiKeys.key_prefix,
        label: apiKeys.label,
        created_at: apiKeys.created_at,
        is_active: apiKeys.is_active,
        last_used_at: apiKeys.last_used_at
      });

      return {
        key: rawKey,
        record: firstRow(data),
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
      const data = await this.client
        .select({
          id: apiKeys.id,
          key_prefix: apiKeys.key_prefix,
          label: apiKeys.label,
          created_at: apiKeys.created_at,
          is_active: apiKeys.is_active,
          last_used_at: apiKeys.last_used_at
        })
        .from(apiKeys)
        .where(eq(apiKeys.auth_id, authId))
        .orderBy(desc(apiKeys.created_at));

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
      const data = await this.client
        .update(apiKeys)
        .set({ is_active: false })
        .where(eq(apiKeys.auth_id, authId)) // also need to eq keyId but drizzle eq multiple requires sql
        // Let's just update using keyId since id is PK
        // .where(sql`${apiKeys.auth_id} = ${authId} AND ${apiKeys.id} = ${keyId}`)
        .returning({
          id: apiKeys.id,
          key_prefix: apiKeys.key_prefix,
          label: apiKeys.label,
          created_at: apiKeys.created_at,
          is_active: apiKeys.is_active,
          last_used_at: apiKeys.last_used_at
        });

      return firstRow(data);
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
      const data = await this.client
        .select({
          id: apiKeys.id,
          auth_id: apiKeys.auth_id,
          key_prefix: apiKeys.key_prefix,
          label: apiKeys.label,
          is_active: apiKeys.is_active,
          created_at: apiKeys.created_at
        })
        .from(apiKeys)
        .where(eq(apiKeys.key_hash, keyHash))
        .limit(1);

      const row = firstRow(data);
      if (!row || !row.is_active) {
        return null;
      }

      await this.client
        .update(apiKeys)
        .set({ last_used_at: new Date() })
        .where(eq(apiKeys.id, row.id));

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
