import React, {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createAnonymousSession,
  fetchRecentAuthenticatedSession,
  initializeSyniqSession,
  readAnonymousToken,
  writeAnonymousToken,
} from '../../../lib/session/initialize';
import { upgradeAnonymousSession } from '../../../lib/session/upgrade';
import { fetchSyniqUsageStatus } from '../../../lib/limits/service';
import { fetchResolveAppState } from '../../../lib/session/resolveAppState';
import { getBackendOrigin, resolveApiFetchBase } from '../utils/runtimeConfig';
import {
  getCurrentAuthSession,
  isAuthClientConfigured,
  signOut as signOutFromAuth,
} from '../services/authService';
import useStore from '../store/useStore';
import { AGENT_PRESENCE_HEARTBEAT_MS } from '../../../shared/agentPresence.js';
import { filterLiveConnectedAgents, isLiveConnectedAgent } from '../utils/agentPresence';
import { touchAgentPresence } from '../services/agentPresenceApi';
import { registerUsageRefreshHandler } from '../utils/usageRefreshBridge';

const SessionContext = createContext(undefined);

function deriveDisplayName(user) {
  if (!user) {
    return null;
  }

  const fromName = String(user.name || '').trim();
  if (fromName) {
    return fromName;
  }

  const fromDisplay = String(user.displayName || '').trim();
  if (fromDisplay) {
    return fromDisplay;
  }

  return user.email?.split('@')[0] || '';
}

/** First two letters of the username string (signup / OAuth name), then email local part. */
function deriveAccountMonogram(user) {
  if (!user) {
    return '';
  }

  const fromUsername = String(user.name || '').trim().replace(/\s+/g, '');
  if (fromUsername.length >= 2) {
    return fromUsername.slice(0, 2).toUpperCase();
  }
  if (fromUsername.length === 1) {
    return (fromUsername + fromUsername).toUpperCase();
  }

  const local = String(user.email || '').split('@')[0] || '';
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  if (local.length === 1) {
    return (local + local).toUpperCase();
  }

  return '';
}

function toStoreUser(user) {
  if (!user) {
    return null;
  }

  const name = deriveDisplayName(user);
  return {
    id: user.id,
    email: user.email || '',
    name,
    initials: deriveAccountMonogram(user),
  };
}

async function readAuthSession(forceAnonymous) {
  if (forceAnonymous || !isAuthClientConfigured()) {
    return {
      user: null,
      accessToken: null,
    };
  }

  return getCurrentAuthSession();
}

export function SessionProvider({ children }) {
  const setUser = useStore((store) => store.setUser);
  const hydratePersistedSession = useStore((store) => store.hydratePersistedSession);
  const resetWorkspace = useStore((store) => store.resetWorkspace);
  const connectedAgents = useStore((store) => store.connectedAgents);
  const backendOrigin = getBackendOrigin();
  const apiFetchBase = resolveApiFetchBase();
  const [state, setState] = useState({
    session: null,
    user: null,
    sessionReady: false,
    isAuthenticated: false,
    configured: isAuthClientConfigured(),
    accessToken: null,
    error: null,
    usage: null,
    usageError: null,
    appState: null,
    appStateError: null,
  });
  const initializeRequestIdRef = useRef(0);
  const wasAuthenticatedRef = useRef(false);
  const accessTokenRef = useRef(null);

  useEffect(() => {
    accessTokenRef.current = state.accessToken;
  }, [state.accessToken]);

  const syncStore = useCallback((session, user) => {
    setUser(toStoreUser(user));

    if (session) {
      hydratePersistedSession(session);
      return;
    }

    resetWorkspace();
  }, [hydratePersistedSession, resetWorkspace, setUser]);

  const refreshUsage = useCallback(async (sessionId = state.session?.id || null, accessToken = state.accessToken || null) => {
    if (!sessionId) {
      startTransition(() => {
        setState((current) => ({
          ...current,
          usage: null,
          usageError: null,
        }));
      });
      return null;
    }

    try {
      const usage = await fetchSyniqUsageStatus(sessionId, accessToken, {
        apiBaseUrl: apiFetchBase,
        anonymousToken: state.session?.anonymousToken || readAnonymousToken(),
      });
      setState((current) => ({
        ...current,
        usage,
        usageError: null,
      }));
      return usage;
    } catch (error) {
      startTransition(() => {
        setState((current) => ({
          ...current,
          usageError: error instanceof Error ? error.message : 'Unable to load usage limits.',
        }));
      });
      return null;
    }
  }, [backendOrigin, state.accessToken, state.session?.anonymousToken, state.session?.id]);

  const initialize = useCallback(async (options = {}) => {
    const requestId = initializeRequestIdRef.current + 1;
    initializeRequestIdRef.current = requestId;

    try {
      let auth = await readAuthSession(options.forceAnonymous === true);

      if (!options.forceAnonymous && !auth.user && wasAuthenticatedRef.current) {
        const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        for (let attempt = 0; attempt < 6 && !auth.user; attempt += 1) {
          await pause(80 + attempt * 100);
          auth = await readAuthSession(false);
        }
      }
      const storedAnonymousToken = readAnonymousToken();
      let backendSession = null;

      if (auth.user && auth.accessToken && storedAnonymousToken) {
        try {
          const upgraded = await upgradeAnonymousSession(auth.accessToken, storedAnonymousToken, {
            apiBaseUrl: apiFetchBase,
          });
          backendSession = upgraded.session || null;
          if (backendSession) {
            writeAnonymousToken(null);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (/already assigned to another account/i.test(message) || /cannot upgrade/i.test(message)) {
            writeAnonymousToken(null);
          }
        }
      }

      if (auth.user && auth.accessToken && !backendSession) {
        try {
          const recent = await fetchRecentAuthenticatedSession(auth.accessToken, {
            apiBaseUrl: apiFetchBase,
          });
          backendSession = recent.session || null;
        } catch {
          backendSession = null;
        }
      }

      if (auth.user && auth.accessToken && !backendSession) {
        const created = await createAnonymousSession({
          apiBaseUrl: apiFetchBase,
        });
        if (created?.anonymousToken) {
          const upgraded = await upgradeAnonymousSession(auth.accessToken, created.anonymousToken, {
            apiBaseUrl: apiFetchBase,
          });
          backendSession = upgraded.session || created.session || null;
        } else {
          backendSession = created.session || null;
        }
      }

      if (!backendSession) {
        const initialized = await initializeSyniqSession({
          apiBaseUrl: apiFetchBase,
        });
        backendSession = initialized.session || null;
      }

      if (requestId !== initializeRequestIdRef.current) {
        return backendSession;
      }

      if (auth.user && (auth.user.id || auth.user.email)) {
        wasAuthenticatedRef.current = true;
      } else if (options.forceAnonymous === true) {
        wasAuthenticatedRef.current = false;
      }

      let resolvedAppState = null;
      let resolvedAppStateError = null;
      let usageFromResolve = null;
      try {
        resolvedAppState = await fetchResolveAppState({
          apiBaseUrl: apiFetchBase,
          accessToken: auth.accessToken,
        });
        if (resolvedAppState?.ok && resolvedAppState.usage) {
          usageFromResolve = resolvedAppState.usage;
        }
        if (resolvedAppState?.ok && resolvedAppState?.lifecycle?.clearAnonymousTokenSuggested) {
          writeAnonymousToken(null);
        }
      } catch (err) {
        resolvedAppStateError = err instanceof Error ? err.message : 'Unable to resolve app state.';
      }

      startTransition(() => {
        setState({
          session: backendSession,
          user: auth.user,
          sessionReady: true,
          isAuthenticated: Boolean(auth.user && (auth.user.id || auth.user.email)),
          configured: isAuthClientConfigured(),
          accessToken: auth.accessToken,
          error: null,
          usage: usageFromResolve,
          usageError: null,
          appState: resolvedAppState?.ok ? resolvedAppState : null,
          appStateError: resolvedAppStateError,
        });
        syncStore(backendSession, auth.user);
      });

      if (!usageFromResolve && backendSession?.id) {
        await refreshUsage(backendSession?.id || null, auth.accessToken);
      }

      initialLoadDoneRef.current = true;
      return backendSession;
    } catch (error) {
      if (requestId !== initializeRequestIdRef.current) {
        return null;
      }

      startTransition(() => {
        setState((current) => ({
          ...current,
          sessionReady: true,
          configured: isAuthClientConfigured(),
          error: error instanceof Error ? error.message : 'Unable to initialize the Syniq session.',
          appState: current.appState,
          appStateError: current.appStateError,
        }));
        if (!current.session?.id) {
          syncStore(null, null);
        }
      });
      initialLoadDoneRef.current = true;
      return null;
    }
  }, [backendOrigin, refreshUsage, syncStore]);

  useEffect(() => {
    initialize().catch(() => {
      return;
    });
  }, [initialize]);

  // Better Auth has no browser push channel; re-check session when the user returns
  // so sign-in state and Syniq session stay aligned with server cookies.
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible' || !initialLoadDoneRef.current) {
        return;
      }

      const sessionId = state.session?.id;
      const agents = useStore.getState().connectedAgents;
      if (sessionId && agents.length > 0) {
        useStore.getState().refreshConnectedAgentsPresence();
        touchAgentPresence(sessionId).catch(() => {
          return;
        });
      }

      window.clearTimeout(focusRefreshTimerRef.current);
      focusRefreshTimerRef.current = window.setTimeout(() => {
        initialize().catch(() => {
          return;
        });
      }, 250);
    };

    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('focus', refreshOnReturn);
      window.clearTimeout(focusRefreshTimerRef.current);
    };
  }, [initialize, state.session?.id]);

  // Keep server-side agent presence fresh while the workspace tab is open.
  useEffect(() => {
    const sessionId = state.session?.id;
    if (!sessionId) {
      return undefined;
    }

    const tick = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      const agents = useStore.getState().connectedAgents;
      if (!agents.some(isLiveConnectedAgent)) {
        return;
      }

      useStore.getState().refreshConnectedAgentsPresence();
      touchAgentPresence(sessionId).catch(() => {
        return;
      });
    };

    tick();
    const intervalId = window.setInterval(tick, AGENT_PRESENCE_HEARTBEAT_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.session?.id]);

  useEffect(() => {
    if (!state.session?.id) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshUsage(state.session?.id, state.accessToken).catch(() => {
        return;
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshUsage, state.accessToken, state.session?.id]);

  useEffect(() => {
    return registerUsageRefreshHandler((sessionId) => {
      refreshUsage(sessionId || state.session?.id, state.accessToken).catch(() => {
        return;
      });
    });
  }, [refreshUsage, state.accessToken, state.session?.id]);

  useEffect(() => {
    const sessionId = state.session?.id;
    if (!sessionId || !state.sessionReady) {
      return undefined;
    }

    let cancelled = false;
    const unsubscribers = [];

    const applyUsagePayload = (payload) => {
      if (!payload?.usage || !payload?.limits) {
        return;
      }

      setState((current) => ({
        ...current,
        usage: {
          ok: true,
          tier: payload.tier ?? current.usage?.tier ?? 'anonymous',
          sessionId: payload.sessionId ?? sessionId,
          authId: current.usage?.authId ?? null,
          anonymousToken: current.usage?.anonymousToken ?? null,
          usage: payload.usage,
          limits: payload.limits,
          blockedLimit: payload.blockedLimit ?? null,
          connectionBlockedLimit: payload.connectionBlockedLimit ?? current.usage?.connectionBlockedLimit ?? null,
          warningLimit: payload.warningLimit ?? current.usage?.warningLimit ?? null,
          resetAt: payload.resetAt ?? current.usage?.resetAt ?? null,
        },
        usageError: null,
      }));
    };

    import('../services/socketClient.js')
      .then(({ default: client }) => {
        if (cancelled) {
          return;
        }

        if (client.sessionId !== sessionId) {
          client.connect(sessionId);
        }

        unsubscribers.push(
          client.subscribe('session', 'limit:usage_updated', applyUsagePayload),
          client.subscribe('orchestration', 'limit:usage_updated', applyUsagePayload)
        );
      })
      .catch(() => {
        return;
      });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [state.session?.id, state.sessionReady]);

  const signOut = useCallback(async () => {
    wasAuthenticatedRef.current = false;
    if (isAuthClientConfigured()) {
      await signOutFromAuth();
    }

    writeAnonymousToken(null);
    await initialize({ forceAnonymous: true });
  }, [initialize]);

  const refreshAppState = useCallback(async () => {
    try {
      const resolved = await fetchResolveAppState({
        apiBaseUrl: apiFetchBase,
        accessToken: accessTokenRef.current,
      });
      startTransition(() => {
        setState((cur) => ({
          ...cur,
          appState: resolved?.ok ? resolved : null,
          appStateError: null,
          usage: resolved?.ok && resolved.usage ? resolved.usage : cur.usage,
        }));
      });
    } catch (err) {
      startTransition(() => {
        setState((cur) => ({
          ...cur,
          appStateError: err instanceof Error ? err.message : String(err),
        }));
      });
    }
  }, [backendOrigin]);

  const hasConnectedAgent = useMemo(() => {
    if (connectedAgents.some(isLiveConnectedAgent)) {
      return true;
    }

    const fromSession = [
      ...(state.session?.connectedAgents || []),
      ...(state.session?.graphState?.connectedAgents || []),
    ];
    return filterLiveConnectedAgents(fromSession).length > 0;
  }, [connectedAgents, state.session]);

  const value = useMemo(() => ({
    ...state,
    hasConnectedAgent,
    refreshSession: () => initialize(),
    refreshUsage: (sessionId = null) => refreshUsage(sessionId, state.accessToken),
    refreshAppState,
    signOut,
  }), [hasConnectedAgent, initialize, refreshAppState, refreshUsage, signOut, state]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider.');
  }

  return context;
}
