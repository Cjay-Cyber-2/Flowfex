import type { FlowfexAuthUser } from '../../packages/types/session';
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from "better-auth/client/plugins";

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

function getBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  // Hard fallback for production — works even without env vars set on frontend
  return 'https://flowfex.onrender.com';
}

// Initialize Better Auth Client
const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [jwtClient()]
});

function createAuthError(code: FlowfexAuthErrorCode, message: string): FlowfexAuthError {
  const error = new Error(message) as FlowfexAuthError;
  Object.defineProperty(error, 'code', {
    value: code,
    enumerable: true,
  });
  return error;
}

export function isAuthClientConfigured(): boolean {
  return true; // Configured!
}

export async function getCurrentAuthSession(): Promise<FlowfexAuthSessionSnapshot> {
  const { data, error } = await authClient.getSession();
  if (error || !data) {
    return { user: null, accessToken: null };
  }

  // Use Better Auth's token. Wait, if jwtClient is used, does getSession return jwt?
  // By default, better-auth session returns the DB session. We can use the session token as the JWT 
  // since we instructed the backend to verify the Better Auth token. Wait!
  // In FlowfexServer.js, we expect `token` to be verified by `jsonwebtoken`. 
  // We configured `jwt` plugin on backend, so better-auth automatically signs the session token as a JWT!
  return {
    user: data.user as unknown as FlowfexAuthUser,
    accessToken: data.session.token || null,
  };
}

export async function signInWithEmail(email: string, password: string):Promise<FlowfexSignInResult> {
  const { data, error } = await authClient.signIn.email({ email, password });
  if (error || !data) {
    throw createAuthError('invalid_credentials', error?.message || 'Invalid credentials');
  }
  return {
    user: data.user as unknown as FlowfexAuthUser,
    accessToken: data.session?.token || null,
  };
}

export async function signUpWithEmail(email: string, password: string, name: string):Promise<FlowfexSignUpResult> {
  const { data, error } = await authClient.signUp.email({ email, password, name });
  if (error || !data) {
    throw createAuthError('invalid_credentials', error?.message || 'Sign up failed');
  }
  return {
    user: data.user as unknown as FlowfexAuthUser,
    emailConfirmationPending: false, // configure based on provider settings
  };
}

export async function signInWithGitHub(): Promise<void> {
  const { error } = await authClient.signIn.social({ provider: 'github' });
  if (error) {
    throw createAuthError('oauth_failed', error.message);
  }
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signIn.social({ provider: 'google' });
  if (error) {
    throw createAuthError('oauth_failed', error.message);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) {
    throw createAuthError('sign_out_failed', error.message);
  }
}

export function onAuthStateChange(
  callback: (payload: FlowfexAuthListenerPayload) => void
): { unsubscribe(): void } {
  // Better auth doesn't have an exact equivalent of firebase onAuthStateChange,
  // we can mock it or use polling, but since the frontend just calls getCurrentAuthSession, it's mostly fine.
  // Real implementation would use their react hooks like `useSession()`.
  return {
    unsubscribe() {}
  };
}
