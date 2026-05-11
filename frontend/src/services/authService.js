// Consolidated auth service — single Better Auth client for the entire frontend
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';
import { getAppOrigin, getBackendOrigin } from '../utils/runtimeConfig';

const authClient = createAuthClient({
  baseURL: getBackendOrigin(),
  plugins: [jwtClient()],
});

function buildAppUrl(pathname = '/dashboard') {
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
  if (typeof window === 'undefined') {
    return { unsubscribe() {} };
  }

  let primed = false;
  let lastUserId;
  let lastToken;

  const dispatch = (event, snapshot) => {
    callback({
      event,
      user: snapshot.user,
      session: snapshot,
    });
  };

  const check = async () => {
    try {
      const snapshot = await getCurrentAuthSession();
      const uid = snapshot.user?.id ?? null;
      const tok = snapshot.accessToken ?? null;

      if (!primed) {
        primed = true;
        lastUserId = uid;
        lastToken = tok;
        return;
      }

      if (uid === lastUserId && tok === lastToken) {
        return;
      }

      const wasIn = lastUserId != null;
      const nowIn = uid != null;
      lastUserId = uid;
      lastToken = tok;

      if (!wasIn && nowIn) {
        dispatch('SIGNED_IN', snapshot);
      } else if (wasIn && !nowIn) {
        dispatch('SIGNED_OUT', snapshot);
      } else {
        dispatch('TOKEN_REFRESHED', snapshot);
      }
    } catch {
      // Ignore transient network errors; the next poll or focus refresh will retry.
    }
  };

  const intervalId = window.setInterval(check, 12000);

  const onVisibleOrFocus = () => {
    if (document.visibilityState === 'visible') {
      check();
    }
  };

  document.addEventListener('visibilitychange', onVisibleOrFocus);
  window.addEventListener('focus', onVisibleOrFocus);
  check();

  return {
    unsubscribe() {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      window.removeEventListener('focus', onVisibleOrFocus);
    },
  };
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
    callbackURL: buildAppUrl('/dashboard'),
  });
  if (error || !data) {
    throw new Error(error?.message || 'Unable to create account. Please try again.');
  }
  return {
    user: data.user,
    needsEmailConfirmation: false,
  };
}

export async function signInWithGitHub(callbackPath = '/dashboard', errorPath = '/signin') {
  const { error } = await authClient.signIn.social({
    provider: 'github',
    callbackURL: buildAppUrl(callbackPath),
    errorCallbackURL: buildAppUrl(errorPath),
  });
  if (error) throw new Error(error.message);
}

export async function signInWithGoogle(callbackPath = '/dashboard', errorPath = '/signin') {
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
