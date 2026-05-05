// Consolidated auth service — single Better Auth client for the entire frontend
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';
import { getAppOrigin } from '../utils/runtimeConfig';

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

function buildCallbackUrl(pathname = '/dashboard') {
  return new URL(pathname, `${getAppOrigin()}/`).toString();
}

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
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
    callbackURL: buildCallbackUrl('/dashboard'),
  });
  if (error || !data) {
    throw new Error(error?.message || 'Unable to create account. Please try again.');
  }
  return {
    user: data.user,
    needsEmailConfirmation: false,
  };
}

export async function signInWithGitHub(callbackPath = '/dashboard') {
  const { error } = await authClient.signIn.social({
    provider: 'github',
    callbackURL: buildCallbackUrl(callbackPath),
  });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle(callbackPath = '/dashboard') {
  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: buildCallbackUrl(callbackPath),
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email, redirectPath = '/reset-password') {
  const { data, error } = await authClient.requestPasswordReset({
    email,
    redirectTo: buildCallbackUrl(redirectPath),
  });
  if (error) {
    throw new Error(error.message || 'Unable to send the password reset email.');
  }
  return data || { status: true };
}

export async function resetPassword(token, newPassword) {
  const { data, error } = await authClient.resetPassword({
    token,
    newPassword,
  });
  if (error) {
    throw new Error(error.message || 'Unable to reset the password.');
  }
  return data || { status: true };
}

// Alias for backward compat
export { signOut as signOutUser };
