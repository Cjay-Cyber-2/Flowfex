const EXECUTION_LIMIT_KEYS = new Set(['maxExecutionsPerSession', 'maxExecutionsPerDay']);

function executionQuotaExhausted(usage) {
  const limit = usage?.blockedLimit?.limit;
  return limit && EXECUTION_LIMIT_KEYS.has(limit);
}

export function resolveProductIdentityState(input) {
  const {
    sessionReady = false,
    isAuthenticated = false,
    appState = null,
    usage = null,
    hasConnectedAgent = false,
  } = input;

  if (!sessionReady || !appState || appState.visitor) return 'visitor';

  const billing = appState.identity?.billing || 'none';
  const connected = Boolean(appState.gates?.agentConnectedServer) || hasConnectedAgent;
  const quotaBlocked = Boolean(appState.gates?.quotaBlocksExecution) || executionQuotaExhausted(usage);
  const identityKind = appState.identity?.kind || 'anonymous';

  if (identityKind === 'anonymous') {
    if (quotaBlocked) return 'anonymous_quota_exhausted';
    return connected ? 'anonymous_connected' : 'anonymous_trial';
  }

  if (billing === 'pro') {
    if (quotaBlocked) return 'authenticated_limit_reached';
    return connected ? 'paid_authenticated' : 'authenticated_connected';
  }

  if (quotaBlocked || usage?.limits?.maxExecutionsPerDay === 0) {
    return connected ? 'authenticated_limit_reached' : 'authenticated_free';
  }

  return connected ? 'authenticated_connected' : 'authenticated_free';
}

export function shouldShowPricingWall(identityState) {
  return identityState === 'authenticated_limit_reached' || identityState === 'authenticated_free';
}

export function shouldShowAnonymousAuthGate(identityState) {
  return identityState === 'anonymous_quota_exhausted';
}
