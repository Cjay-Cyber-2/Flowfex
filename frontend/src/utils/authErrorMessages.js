const AUTH_ERROR_MESSAGES = {
  state_mismatch: 'The social sign-in session expired before Flowfex could verify it. Please try again.',
  please_restart_the_process: 'The social sign-in flow was interrupted. Please restart it.',
  access_denied: 'The provider denied access to the requested account.',
  oauth_provider_not_found: 'This social sign-in provider is not configured correctly right now.',
  invalid_callback_request: 'Flowfex could not verify the provider callback. Please try again.',
  no_code: 'The provider callback was incomplete. Please try again.',
  invalid_code: 'The provider authorization code was rejected. Please try again.',
  user_creation_failed: 'Flowfex could not finish creating the account from the provider response.',
  user_already_exists: 'An account already exists for that email. Try signing in instead.',
};

export function getAuthErrorMessage(errorCode, fallbackMessage = 'Unable to complete authentication right now.') {
  if (!errorCode) {
    return fallbackMessage;
  }

  const normalizedCode = String(errorCode).trim().toLowerCase();
  return AUTH_ERROR_MESSAGES[normalizedCode] || fallbackMessage;
}
