const EXECUTION_LIMIT_KEYS = new Set(['maxExecutionsPerSession', 'maxExecutionsPerDay']);

/** True when the user exhausted Syniq skill/tool pulls (not attach-only caps). */
export function isExecutionQuotaExhausted(usage) {
  const blocked = usage?.blockedLimit;
  if (!blocked?.limit) {
    return false;
  }
  return EXECUTION_LIMIT_KEYS.has(blocked.limit);
}

export function quotaCycleKey(usage) {
  return String(usage?.resetAt || usage?.tier || 'default');
}

export function hasSeenPricingWall(cycleKey) {
  if (typeof window === 'undefined' || !cycleKey) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(`syniq-pricing-wall:${cycleKey}`) === '1';
  } catch {
    return false;
  }
}

export function markPricingWallSeen(cycleKey) {
  if (typeof window === 'undefined' || !cycleKey) {
    return;
  }
  try {
    window.sessionStorage.setItem(`syniq-pricing-wall:${cycleKey}`, '1');
  } catch {
    /* ignore */
  }
}

export function clearPricingWallSeen(cycleKey) {
  if (typeof window === 'undefined' || !cycleKey) {
    return;
  }
  try {
    window.sessionStorage.removeItem(`syniq-pricing-wall:${cycleKey}`);
  } catch {
    /* ignore */
  }
}
