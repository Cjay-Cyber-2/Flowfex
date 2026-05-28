// Consolidated auth service — single Better Auth client for the entire frontend
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';
import { getAppOrigin, getBackendOrigin } from '../utils/runtimeConfig';
import { extractAuthErrorMessage, getAuthErrorMessage } from '../utils/authErrorMessages';

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

function throwAuthError(error, fallbackMessage) {
  const message = getAuthErrorMessage(extractAuthErrorMessage(error), fallbackMessage);
  throw new Error(message);
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
    if (error) {
      continue;
    }
    if (!data) {
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
    throwAuthError(error, 'Invalid credentials. Please try again.');
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
    throwAuthError(error, 'Unable to create account. Please try again.');
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
    throwAuthError(error, 'Unable to save your username.');
  }
}

export async function signInWithGitHub(callbackPath = '/app', errorPath = '/signin') {
  const { data, error } = await authClient.signIn.social({
    provider: 'github',
    callbackURL: buildAppUrl(callbackPath),
    errorCallbackURL: buildAppUrl(errorPath),
  });
  if (error) {
    throwAuthError(error, 'Unable to start GitHub sign-in.');
  }
  if (data?.url && typeof window !== 'undefined') {
    window.location.assign(data.url);
  }
}

export async function signInWithGoogle(callbackPath = '/app', errorPath = '/signin') {
  const { data, error } = await authClient.signIn.social({
    provider: 'google',
    callbackURL: buildAppUrl(callbackPath),
    errorCallbackURL: buildAppUrl(errorPath),
  });
  if (error) {
    throwAuthError(error, 'Unable to start Google sign-in.');
  }
  if (data?.url && typeof window !== 'undefined') {
    window.location.assign(data.url);
  }
}

export async function requestPasswordReset(email, redirectPath = '/reset-password') {
  const { data, error } = await authClient.requestPasswordReset({
    email,
    redirectTo: buildAppUrl(redirectPath),
  });
  if (error) {
    throwAuthError(error, 'Unable to send the password reset email.');
  }
  return data || { status: true };
}

export async function resetPassword(token, newPassword) {
  const { data, error } = await authClient.resetPassword({
    token,
    newPassword,
  });
  if (error) {
    throwAuthError(error, 'Unable to reset the password.');
  }
  return data || { status: true };
}

// Alias for backward compat
export { signOut as signOutUser };
