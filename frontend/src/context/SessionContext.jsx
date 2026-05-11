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
  initializeFlowfexSession,
  readAnonymousToken,
  writeAnonymousToken,
} from '../../../lib/session/initialize';
import { upgradeAnonymousSession } from '../../../lib/session/upgrade';
import { fetchFlowfexUsageStatus } from '../../../lib/limits/service';
import { getBackendOrigin } from '../utils/runtimeConfig';
import {
  getCurrentAuthSession,
  isAuthClientConfigured,
  signOut as signOutFromAuth,
} from '../services/authService';
import useStore from '../store/useStore';
import { filterLiveConnectedAgents, isLiveConnectedAgent } from '../utils/agentPresence';

const SessionContext = createContext(undefined);

function deriveDisplayName(user) {
  if (!user) {
    return null;
  }

  return user.displayName || user.email?.split('@')[0] || 'Flowfex User';
}

function deriveInitials(name) {
  const compact = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();

  return compact || 'FX';
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
    initials: deriveInitials(name),
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
  });
  const initializeRequestIdRef = useRef(0);

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
      const usage = await fetchFlowfexUsageStatus(sessionId, accessToken, {
        apiBaseUrl: backendOrigin,
        anonymousToken: state.session?.anonymousToken || readAnonymousToken(),
      });
      startTransition(() => {
        setState((current) => ({
          ...current,
          usage,
          usageError: null,
        }));
      });
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
      const auth = await readAuthSession(options.forceAnonymous === true);
      const storedAnonymousToken = readAnonymousToken();
      let backendSession = null;

      if (auth.user && auth.accessToken && storedAnonymousToken) {
        try {
          const upgraded = await upgradeAnonymousSession(auth.accessToken, storedAnonymousToken, {
            apiBaseUrl: backendOrigin,
          });
          backendSession = upgraded.session || null;
          writeAnonymousToken(null);
        } catch {
          writeAnonymousToken(null);
        }
      }

      if (auth.user && auth.accessToken && !backendSession) {
        try {
          const recent = await fetchRecentAuthenticatedSession(auth.accessToken, {
            apiBaseUrl: backendOrigin,
          });
          backendSession = recent.session || null;
        } catch {
          backendSession = null;
        }
      }

      if (auth.user && auth.accessToken && !backendSession) {
        const created = await createAnonymousSession({
          apiBaseUrl: backendOrigin,
        });
        if (created?.anonymousToken) {
          const upgraded = await upgradeAnonymousSession(auth.accessToken, created.anonymousToken, {
            apiBaseUrl: backendOrigin,
          });
          backendSession = upgraded.session || created.session || null;
        } else {
          backendSession = created.session || null;
        }
      }

      if (!backendSession) {
        const initialized = await initializeFlowfexSession({
          apiBaseUrl: backendOrigin,
        });
        backendSession = initialized.session || null;
      }

      if (requestId !== initializeRequestIdRef.current) {
        return backendSession;
      }

      startTransition(() => {
        setState({
          session: backendSession,
          user: auth.user,
          sessionReady: true,
          isAuthenticated: Boolean(auth.user),
          configured: isAuthClientConfigured(),
          accessToken: auth.accessToken,
          error: null,
          usage: null,
          usageError: null,
        });
        syncStore(backendSession, auth.user);
      });

      await refreshUsage(backendSession?.id || null, auth.accessToken);
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
          error: error instanceof Error ? error.message : 'Unable to initialize the Flowfex session.',
        }));
        syncStore(null, null);
      });
      return null;
    }
  }, [backendOrigin, refreshUsage, syncStore]);

  useEffect(() => {
    initialize().catch(() => {
      return;
    });
  }, [initialize]);

  // Better Auth has no browser push channel; re-check session when the user returns
  // so sign-in state and Flowfex session stay aligned with server cookies.
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      initialize().catch(() => {
        return;
      });
    };

    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('focus', refreshOnReturn);
    };
  }, [initialize]);

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

  const signOut = useCallback(async () => {
    if (isAuthClientConfigured()) {
      await signOutFromAuth();
    }

    writeAnonymousToken(null);
    await initialize({ forceAnonymous: true });
  }, [initialize]);

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
    signOut,
  }), [hasConnectedAgent, initialize, refreshUsage, signOut, state]);

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
