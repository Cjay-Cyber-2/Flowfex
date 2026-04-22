import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '../supabase/client';
import type { FlowfexAuthUser } from '../../packages/types/session';

export type FlowfexAuthErrorCode =
  | 'config_missing'
  | 'invalid_credentials'
  | 'oauth_failed'
  | 'sign_out_failed'
  | 'unknown';

export interface FlowfexAuthError extends Error {
  readonly code: FlowfexAuthErrorCode;
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
  readonly event: AuthChangeEvent;
  readonly user: FlowfexAuthUser | null;
  readonly session: Session | null;
}

interface BrowserEnvShape {
  readonly VITE_APP_URL?: string;
}

interface ImportMetaShape {
  readonly env?: BrowserEnvShape;
}

function createAuthError(code: FlowfexAuthErrorCode, message: string): FlowfexAuthError {
  const error = new Error(message) as FlowfexAuthError;
  Object.defineProperty(error, 'code', {
    value: code,
    enumerable: true,
  });
  return error;
}

function toAuthUser(session: Session | null): FlowfexAuthUser | null {
  const user = session?.user ?? null;
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata;
  const displayName =
    typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : typeof metadata?.name === 'string'
        ? metadata.name
        : null;
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    avatarUrl,
  };
}

function mapAuthFailure(error: unknown, fallbackMessage: string): FlowfexAuthError {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return createAuthError('invalid_credentials', 'Invalid email or password.');
  }

  if (normalized.includes('supabase') || normalized.includes('missing')) {
    return createAuthError('config_missing', message);
  }

  return createAuthError('unknown', message);
}

function readRedirectUrl(): string | undefined {
  const importMetaShape = import.meta as ImportMetaShape;
  const configuredOrigin = importMetaShape.env?.VITE_APP_URL?.trim();

  if (configuredOrigin) {
    return `${configuredOrigin.replace(/\/+$/, '')}/dashboard`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/dashboard`;
  }

  return undefined;
}

export async function signInWithEmail(email: string, password: string): Promise<FlowfexSignInResult> {
  try {
    const client = createSupabaseBrowserClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const user = toAuthUser(data.session);
    if (!user) {
      throw createAuthError('invalid_credentials', 'Supabase did not return a user session.');
    }

    return {
      user,
      accessToken: data.session?.access_token ?? null,
    };
  } catch (error) {
    throw mapAuthFailure(error, 'Unable to sign in with email and password.');
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<FlowfexSignUpResult> {
  try {
    const client = createSupabaseBrowserClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: readRedirectUrl(),
      },
    });

    if (error) {
      throw error;
    }

    return {
      user: toAuthUser(data.session),
      emailConfirmationPending: !data.session,
    };
  } catch (error) {
    throw mapAuthFailure(error, 'Unable to sign up with email and password.');
  }
}

async function signInWithOAuth(provider: 'github' | 'google'): Promise<void> {
  try {
    const client = createSupabaseBrowserClient();
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: readRedirectUrl(),
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    const mapped = mapAuthFailure(error, `Unable to sign in with ${provider}.`);
    throw createAuthError('oauth_failed', mapped.message);
  }
}

export async function signInWithGitHub(): Promise<void> {
  await signInWithOAuth('github');
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithOAuth('google');
}

export async function signOut(): Promise<void> {
  try {
    const client = createSupabaseBrowserClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign out.';
    throw createAuthError('sign_out_failed', message);
  }
}

export function onAuthStateChange(
  callback: (payload: FlowfexAuthListenerPayload) => void
): { unsubscribe(): void } {
  const client = createSupabaseBrowserClient();
  const subscription = client.auth.onAuthStateChange((event, session) => {
    callback({
      event,
      user: toAuthUser(session),
      session,
    });
  });

  return {
    unsubscribe() {
      subscription.data.subscription.unsubscribe();
    },
  };
}
