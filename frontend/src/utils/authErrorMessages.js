const AUTH_ERROR_MESSAGES = {
  state_mismatch: 'The social sign-in session expired before Syniq could verify it. Please try again.',
  please_restart_the_process: 'The social sign-in flow was interrupted. Please restart it.',
  access_denied: 'The provider denied access to the requested account.',
  oauth_provider_not_found: 'This social sign-in provider is not configured correctly right now.',
  invalid_callback_request: 'Syniq could not verify the provider callback. Please try again.',
  no_code: 'The provider callback was incomplete. Please try again.',
  invalid_code: 'The provider authorization code was rejected. Please try again.',
  user_creation_failed: 'Syniq could not finish creating the account from the provider response.',
  user_already_exists: 'An account already exists for that email. Try signing in instead.',
  email_already_exists: 'An account already exists for that email. Try signing in instead.',
  invalid_email: 'Enter a valid email address.',
  password_too_short: 'Use a longer password (at least 8 characters).',
  route_not_found: 'Syniq could not reach the sign-in service. Refresh and try again.',
};

export function extractAuthErrorMessage(error) {
  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return error.trim() || null;
  }

  const candidates = [
    error.message,
    error.error?.message,
    error.body?.message,
    error.data?.message,
    error.response?.message,
    error.statusText,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function getAuthErrorMessage(errorCode, fallbackMessage = 'Unable to complete authentication right now.') {
  const direct = extractAuthErrorMessage(errorCode);
  if (direct && direct !== errorCode) {
    return normalizeKnownAuthMessage(direct) || direct;
  }

  if (!errorCode) {
    return fallbackMessage;
  }

  const normalizedCode = String(errorCode).trim().toLowerCase().replace(/\s+/g, '_');
  if (AUTH_ERROR_MESSAGES[normalizedCode]) {
    return AUTH_ERROR_MESSAGES[normalizedCode];
  }

  return normalizeKnownAuthMessage(String(errorCode)) || fallbackMessage;
}

function normalizeKnownAuthMessage(message) {
  const normalized = String(message).trim().toLowerCase();
  if (normalized === 'route not found') {
    return AUTH_ERROR_MESSAGES.route_not_found;
  }
  if (normalized.includes('user already exists') || normalized.includes('email already')) {
    return AUTH_ERROR_MESSAGES.user_already_exists;
  }
  if (normalized.includes('invalid email')) {
    return AUTH_ERROR_MESSAGES.invalid_email;
  }
  if (normalized.includes('password') && normalized.includes('short')) {
    return AUTH_ERROR_MESSAGES.password_too_short;
  }
  return null;
}
