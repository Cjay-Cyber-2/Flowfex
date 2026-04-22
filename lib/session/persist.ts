import type {
  FlowfexConnectedAgent,
  FlowfexGraphState,
  FlowfexPersistedSessionStatus,
  FlowfexSessionStatus,
} from '../../packages/types/graph';

export interface PersistedGraphStatePayload {
  readonly sessionId: string;
  readonly graphState: FlowfexGraphState;
  readonly executionPointer: string | null;
  readonly connectedAgents: readonly FlowfexConnectedAgent[];
  readonly constraints: readonly string[];
  readonly mode: FlowfexGraphState['mode'];
  readonly status: FlowfexPersistedSessionStatus;
  readonly snapshot: FlowfexGraphState;
}

export type PersistSessionWriter = (payload: PersistedGraphStatePayload) => Promise<void>;

export interface SessionPersistor {
  schedule(graphState: FlowfexGraphState): void;
  flush(): Promise<void>;
  startHeartbeat(): void;
  stopHeartbeat(): void;
  dispose(): void;
}

export interface SessionPersistorOptions {
  readonly sessionId: string;
  readonly debounceMs?: number;
  readonly heartbeatMs?: number;
  readonly write: PersistSessionWriter;
}

function toPersistedStatus(status: FlowfexSessionStatus | undefined): FlowfexPersistedSessionStatus {
  switch (status) {
    case 'paused':
      return 'paused';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'error';
    default:
      return 'active';
  }
}

export function serializeGraphState(graphState: FlowfexGraphState): FlowfexGraphState {
  return JSON.parse(JSON.stringify(graphState)) as FlowfexGraphState;
}

function buildPayload(sessionId: string, graphState: FlowfexGraphState): PersistedGraphStatePayload {
  const snapshot = serializeGraphState(graphState);

  return {
    sessionId,
    graphState: snapshot,
    executionPointer: snapshot.executionPointer ?? snapshot.currentNodeId ?? null,
    connectedAgents: snapshot.connectedAgents,
    constraints: snapshot.constraints,
    mode: snapshot.mode,
    status: toPersistedStatus(snapshot.status),
    snapshot,
  };
}

export function createSessionPersistor(options: SessionPersistorOptions): SessionPersistor {
  const debounceMs = options.debounceMs ?? 500;
  const heartbeatMs = options.heartbeatMs ?? 10_000;
  let pendingGraphState: FlowfexGraphState | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  async function flushPending(): Promise<void> {
    if (!pendingGraphState) {
      return;
    }

    const nextPayload = buildPayload(options.sessionId, pendingGraphState);
    pendingGraphState = null;
    await options.write(nextPayload);
  }

  return {
    schedule(graphState) {
      pendingGraphState = graphState;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        flushPending().catch(() => {
          pendingGraphState = graphState;
        });
      }, debounceMs);
    },
    async flush() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      await flushPending();
    },
    startHeartbeat() {
      if (heartbeatTimer) {
        return;
      }

      heartbeatTimer = setInterval(() => {
        flushPending().catch(() => {
          return;
        });
      }, heartbeatMs);
    },
    stopHeartbeat() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
    dispose() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  };
}
