/** Lets socket handlers trigger SessionContext usage refresh without a circular import. */
let refreshHandler = null;

export function registerUsageRefreshHandler(handler) {
  refreshHandler = handler;
  return () => {
    if (refreshHandler === handler) {
      refreshHandler = null;
    }
  };
}

export function requestUsageRefresh(sessionId = null) {
  if (typeof refreshHandler === 'function') {
    refreshHandler(sessionId);
  }
}
