import type { FlowfexAuthUser } from '../../packages/types/session';

export type FlowfexAuthChangeEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED';

export type FlowfexAuthErrorCode =
  | 'config_missing'
  | 'invalid_credentials'
  | 'oauth_failed'
  | 'sign_out_failed'
  | 'unknown';

export interface FlowfexAuthError extends Error {
  readonly code: FlowfexAuthErrorCode;
}

export interface FlowfexAuthSessionSnapshot {
  readonly user: FlowfexAuthUser | null;
  readonly accessToken: string | null;
}

export interface FlowfexSignInResult {
  readonly user: FlowfexAuthUser;
  readonly accessToken: string | null;
}

export interface FlowfexSignUpResult {
  readonly user: FlowfexAuthUser | null;
  readonly emailConfirmationPending: boolean;
}

export interface FlowfexAuthListenerPayload {
  readonly event: FlowfexAuthChangeEvent;
  readonly user: FlowfexAuthUser | null;
  readonly session: FlowfexAuthSessionSnapshot | null;
}

function createAuthError(code: FlowfexAuthErrorCode, message: string): FlowfexAuthError {
  const error = new Error(message) as FlowfexAuthError;
  Object.defineProperty(error, 'code', {
    value: code,
    enumerable: true,
  });
  return error;
}

export function isAuthClientConfigured(): boolean {
  return false;
}

export async function getCurrentAuthSession(): Promise<FlowfexAuthSessionSnapshot> {
  return {
    user: null,
    accessToken: null,
  };
}

function createUnavailableError(message: string): FlowfexAuthError {
  return createAuthError('config_missing', message);
}

export async function signInWithEmail(): Promise<FlowfexSignInResult> {
  throw createUnavailableError('Authentication is not configured yet. Continue the Better Auth migration to enable sign-in.');
}

export async function signUpWithEmail(): Promise<FlowfexSignUpResult> {
  throw createUnavailableError('Authentication is not configured yet. Continue the Better Auth migration to enable sign-up.');
}

export async function signInWithGitHub(): Promise<void> {
  throw createUnavailableError('GitHub sign-in is not configured yet. Continue the Better Auth migration to enable social login.');
}

export async function signInWithGoogle(): Promise<void> {
  throw createUnavailableError('Google sign-in is not configured yet. Continue the Better Auth migration to enable social login.');
}

export async function signOut(): Promise<void> {
  return;
}

export function onAuthStateChange(
  _callback: (payload: FlowfexAuthListenerPayload) => void
): { unsubscribe(): void } {
  return {
    unsubscribe() {
      return;
    },
  };
}
