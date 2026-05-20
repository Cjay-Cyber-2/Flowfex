// Consolidated auth service — single Better Auth client for the entire frontend
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';
import { getAppOrigin, getBackendOrigin } from '../utils/runtimeConfig';

function getAuthBaseUrl() {
  if (import.meta.env.VITE_API_DIRECT === '1' || import.meta.env.VITE_API_DIRECT === 'true') {
    return getBackendOrigin();
  }
  return getAppOrigin();
}

const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  basePath: '/api/auth',
  plugins: [jwtClient()],
});

function buildAppUrl(pathname = '/app') {
  return new URL(pathname, `${getAppOrigin()}/`).toString();
}

// ─── Used by SessionContext ──────────────────────────────────────────

export function isAuthClientConfigured() {
  return true;
}

export function userMustChooseSyniqUsername(user) {
  return Boolean(user && user.syniqHandleChosen === false);
}

export async function getCurrentAuthSession() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const attempts = 4;
  for (let index = 0; index < attempts; index += 1) {
    if (index > 0) {
      await wait(90 * index);
    }
    const { data, error } = await authClient.getSession();
    if (error || !data) {
      continue;
    }
    const rawUser = data.user;
    const user = rawUser && (rawUser.id || rawUser.email) ? rawUser : null;
    if (user) {
      return {
        user,
        accessToken: data.session?.token ?? null,
      };
    }
  }
  return { user: null, accessToken: null };
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
    syniqHandleChosen: true,
    callbackURL: buildAppUrl('/app'),
  });
  if (error || !data) {
    throw new Error(error?.message || 'Unable to create account. Please try again.');
  }
  return { user: data.user, needsEmailConfirmation: false };
}

/** Sets Better Auth `name` (Syniq username) and marks the handle step complete (OAuth users). */
export async function setSyniqProfileUsername(name) {
  const { error } = await authClient.updateUser({
    name,
    syniqHandleChosen: true,
  });
  if (error) {
    throw new Error(error.message || 'Unable to save your username.');
  }
}

export async function signInWithGitHub(callbackPath = '/app', errorPath = '/signin') {
  const { error } = await authClient.signIn.social({
    provider: 'github',
    callbackURL: buildAppUrl(callbackPath),
    errorCallbackURL: buildAppUrl(errorPath),
  });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle(callbackPath = '/app', errorPath = '/signin') {
  const { error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: buildAppUrl(callbackPath),
    errorCallbackURL: buildAppUrl(errorPath),
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email, redirectPath = '/reset-password') {
  const { data, error } = await authClient.requestPasswordReset({
    email,
    redirectTo: buildAppUrl(redirectPath),
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
