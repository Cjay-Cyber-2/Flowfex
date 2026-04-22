import { getAppOrigin } from '../utils/runtimeConfig';
import { getSupabaseBrowserClient } from './supabaseBrowser';

function requireSupabaseClient() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error('Supabase auth is not configured for this environment.');
  }

  return client;
}

function mapAuthError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;

  return new Error(message);
}

export async function signInWithEmail(email, password) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw mapAuthError(error, 'Unable to sign in with email and password.');
  }

  return data;
}

export async function signUpWithEmail(email, password) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppOrigin()}/signin`,
    },
  });

  if (error) {
    throw mapAuthError(error, 'Unable to create your Flowfex account.');
  }

  return {
    ...data,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signInWithGitHub() {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${getAppOrigin()}/signin`,
    },
  });

  if (error) {
    throw mapAuthError(error, 'Unable to start GitHub sign-in.');
  }

  return data;
}

export async function signInWithGoogle() {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getAppOrigin()}/signin`,
    },
  });

  if (error) {
    throw mapAuthError(error, 'Unable to start Google sign-in.');
  }

  return data;
}

export async function signOutUser() {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw mapAuthError(error, 'Unable to sign out.');
  }
}

export function onAuthStateChange(callback) {
  const client = requireSupabaseClient();
  const result = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    result.data.subscription.unsubscribe();
  };
}
