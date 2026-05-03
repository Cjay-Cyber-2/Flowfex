// Real Better Auth client wired up — replaces the stub
import { createAuthClient } from 'better-auth/client';
import { jwtClient } from 'better-auth/client/plugins';

function getBackendUrl() {
  // Check Vite env first, fall back to the known production URL
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const env = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
    if (env) return env;
  }
  // Hard fallback — always works in production even without env vars
  return 'https://flowfex.onrender.com';
}

const authClient = createAuthClient({
  baseURL: getBackendUrl(),
  plugins: [jwtClient()],
});

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

export async function signOutUser() {
  await authClient.signOut();
}

export function onAuthStateChange() {
  // Better Auth uses polling/hooks — no-op listener for compatibility
  return () => {};
}
