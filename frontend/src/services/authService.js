function createUnavailableError(message) {
  return new Error(message);
}

export async function signInWithEmail() {
  throw createUnavailableError('Authentication is not configured yet. Continue the Better Auth migration to enable sign-in.');
}

export async function signUpWithEmail() {
  throw createUnavailableError('Authentication is not configured yet. Continue the Better Auth migration to enable sign-up.');
}

export async function signInWithGitHub() {
  throw createUnavailableError('GitHub sign-in is not configured yet. Continue the Better Auth migration to enable social login.');
}

export async function signInWithGoogle() {
  throw createUnavailableError('Google sign-in is not configured yet. Continue the Better Auth migration to enable social login.');
}

export async function signOutUser() {
  return;
}

export function onAuthStateChange() {
  return () => {
    return;
  };
}
