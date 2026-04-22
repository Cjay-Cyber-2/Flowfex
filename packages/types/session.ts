import type {
  FlowfexCanvasMode,
  FlowfexConnectedAgent,
  FlowfexGraphState,
  FlowfexPersistedSessionStatus,
} from './graph';

export interface FlowfexAuthUser {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}

export interface FlowfexSessionRecord {
  readonly id: string;
  readonly authId: string | null;
  readonly anonymousToken: string | null;
  readonly status: FlowfexPersistedSessionStatus;
  readonly graphState: FlowfexGraphState;
  readonly executionPointer: string | null;
  readonly connectedAgents: readonly FlowfexConnectedAgent[];
  readonly constraints: readonly string[];
  readonly mode: FlowfexCanvasMode;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly lastActiveAt?: string;
  readonly name?: string | null;
  readonly task?: string | null;
  readonly heartbeat?: string | null;
}

export interface FlowfexAnonymousSessionResponse {
  readonly ok: boolean;
  readonly anonymousToken: string;
  readonly session: FlowfexSessionRecord | null;
}

export interface FlowfexRecentSessionResponse {
  readonly ok: boolean;
  readonly session: FlowfexSessionRecord | null;
}

export interface FlowfexSessionUpgradeResponse {
  readonly ok: boolean;
  readonly session: FlowfexSessionRecord | null;
}

export interface FlowfexApiKeyRecord {
  readonly id: string;
  readonly key_prefix: string;
  readonly label: string;
  readonly created_at: string;
  readonly is_active: boolean;
  readonly last_used_at: string | null;
}

export interface FlowfexApiKeyListResponse {
  readonly ok: boolean;
  readonly apiKeys: readonly FlowfexApiKeyRecord[];
}

export interface FlowfexApiKeyGenerationResponse {
  readonly ok: boolean;
  readonly apiKey: string;
  readonly record: FlowfexApiKeyRecord;
}

export interface FlowfexApiKeyRevokeResponse {
  readonly ok: boolean;
  readonly record: FlowfexApiKeyRecord;
}
