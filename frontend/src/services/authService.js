// Consolidated auth service — single Better Auth client for the entire frontend
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';

function getBackendUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
    if (env) return env;
  }
  return 'https://flowfex.onrender.com';
}

const authClient = createAuthClient({
  baseURL: getBackendUrl(),
  plugins: [jwtClient()],
});

// ─── Used by SessionContext ──────────────────────────────────────────

export function isAuthClientConfigured() {
  return true;
}

export async function getCurrentAuthSession() {
  const { data, error } = await authClient.getSession();
  if (error || !data) {
    return { user: null, accessToken: null };
  }
  return {
    user: data.user,
    accessToken: data.session?.token || null,
  };
}

export function onAuthStateChange(callback) {
  // Better Auth doesn't have a real-time listener like Firebase.
  // The frontend uses polling via SessionContext instead.
  return { unsubscribe() {} };
}

export async function signOut() {
  await authClient.signOut();
}

// ─── Used by SignIn / SignUp pages ───────────────────────────────────

export async function signInWithEmail(email, password) {
  const { data, error } = await authClient.signIn.email({ email, password });
  if (error || !data) {
    throw new Error(error?.message || 'Invalid credentials. Please try again.');
  }
  return {
    user: data.user,
    accessToken: data.session?.token || null,
  };
}

export async function signUpWithEmail(email, password, name = '') {
  const { data, error } = await authClient.signUp.email({ email, password, name });
  if (error || !data) {
    throw new Error(error?.message || 'Unable to create account. Please try again.');
  }
  return {
    user: data.user,
    needsEmailConfirmation: false,
  };
}

export async function signInWithGitHub() {
  const { error } = await authClient.signIn.social({ provider: 'github' });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle() {
  const { error } = await authClient.signIn.social({ provider: 'google' });
  if (error) throw new Error(error.message);
}

// Alias for backward compat
export { signOut as signOutUser };
