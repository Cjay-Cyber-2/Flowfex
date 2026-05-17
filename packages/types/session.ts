import type {
  SyniqCanvasMode,
  SyniqConnectedAgent,
  SyniqGraphState,
  SyniqPersistedSessionStatus,
} from './graph';

export interface SyniqAuthUser {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}

export interface SyniqSessionRecord {
  readonly id: string;
  readonly connectionId?: string | null;
  readonly authId: string | null;
  readonly anonymousToken: string | null;
  readonly status: SyniqPersistedSessionStatus;
  readonly graphState: SyniqGraphState;
  readonly executionPointer: string | null;
  readonly connectedAgents: readonly SyniqConnectedAgent[];
  readonly constraints: readonly string[];
  readonly mode: SyniqCanvasMode;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly lastActiveAt?: string;
  readonly name?: string | null;
  readonly task?: string | null;
  readonly heartbeat?: string | null;
}

export interface SyniqAnonymousSessionResponse {
  readonly ok: boolean;
  readonly anonymousToken: string;
  readonly session: SyniqSessionRecord | null;
}

export interface SyniqRecentSessionResponse {
  readonly ok: boolean;
  readonly session: SyniqSessionRecord | null;
}

export interface SyniqSessionUpgradeResponse {
  readonly ok: boolean;
  readonly session: SyniqSessionRecord | null;
}

export interface SyniqApiKeyRecord {
  readonly id: string;
  readonly key_prefix: string;
  readonly label: string;
  readonly created_at: string;
  readonly is_active: boolean;
  readonly last_used_at: string | null;
}

export interface SyniqApiKeyListResponse {
  readonly ok: boolean;
  readonly apiKeys: readonly SyniqApiKeyRecord[];
}

export interface SyniqApiKeyGenerationResponse {
  readonly ok: boolean;
  readonly apiKey: string;
  readonly record: SyniqApiKeyRecord;
}

export interface SyniqApiKeyRevokeResponse {
  readonly ok: boolean;
  readonly record: SyniqApiKeyRecord;
}
