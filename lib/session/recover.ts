import type { FlowfexSessionRecord } from '../../packages/types/session';
import type { FlowfexGraphState } from '../../packages/types/graph';
import { resolveRehydratedGraphState, type FlowfexSnapshotEvent } from './rehydrate';

export interface ReconnectBackoffOptions {
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly multiplier?: number;
  readonly jitterRatio?: number;
}

export function getReconnectDelayMs(
  attempt: number,
  options: ReconnectBackoffOptions = {}
): number {
  const initialDelayMs = options.initialDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const multiplier = options.multiplier ?? 1.8;
  const jitterRatio = options.jitterRatio ?? 0.12;
  const boundedAttempt = Math.max(0, attempt);
  const exponentialDelay = Math.min(maxDelayMs, initialDelayMs * multiplier ** boundedAttempt);
  const jitter = exponentialDelay * jitterRatio;
  return Math.round(exponentialDelay + jitter);
}

export function isSessionStale(
  session: Pick<FlowfexSessionRecord, 'authId' | 'lastActiveAt'>,
  now: number = Date.now()
): boolean {
  if (!session.lastActiveAt) {
    return false;
  }

  const lastActiveAt = Date.parse(session.lastActiveAt);
  if (Number.isNaN(lastActiveAt)) {
    return false;
  }

  const maxAgeMs = session.authId ? 8 * 60 * 60 * 1000 : 30 * 60 * 1000;
  return now - lastActiveAt > maxAgeMs;
}

export function recoverGraphState(
  primaryGraphState: unknown,
  snapshots: readonly FlowfexSnapshotEvent[] = []
): FlowfexGraphState {
  return resolveRehydratedGraphState(primaryGraphState, snapshots);
}
