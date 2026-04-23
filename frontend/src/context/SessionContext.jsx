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
import { onAuthStateChange, signOut as signOutFromSupabase } from '../../../lib/auth/service';
import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from '../../../lib/supabase/client';
import useStore from '../store/useStore';

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

function mapSupabaseUser(user) {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata;
  const displayName = typeof metadata?.full_name === 'string'
    ? metadata.full_name
    : typeof metadata?.name === 'string'
      ? metadata.name
      : null;
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    avatarUrl,
  };
}

async function readSupabaseAuthSession(forceAnonymous) {
  if (forceAnonymous || !isSupabaseBrowserConfigured()) {
    return {
      user: null,
      accessToken: null,
    };
  }

  const client = createSupabaseBrowserClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }

  return {
    user: mapSupabaseUser(data.session?.user || null),
    accessToken: data.session?.access_token ?? null,
  };
}

export function SessionProvider({ children }) {
  const setUser = useStore((store) => store.setUser);
  const hydratePersistedSession = useStore((store) => store.hydratePersistedSession);
  const resetWorkspace = useStore((store) => store.resetWorkspace);
  const connectedAgents = useStore((store) => store.connectedAgents);
  const [state, setState] = useState({
    session: null,
    user: null,
    sessionReady: false,
    isAuthenticated: false,
    configured: isSupabaseBrowserConfigured(),
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
      const usage = await fetchFlowfexUsageStatus(sessionId, accessToken);
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
  }, [state.accessToken, state.session?.id]);

  const initialize = useCallback(async (options = {}) => {
    const requestId = initializeRequestIdRef.current + 1;
    initializeRequestIdRef.current = requestId;

    try {
      const auth = await readSupabaseAuthSession(options.forceAnonymous === true);
      const storedAnonymousToken = readAnonymousToken();
      let backendSession = null;

      if (auth.user && auth.accessToken && storedAnonymousToken) {
        try {
          const upgraded = await upgradeAnonymousSession(auth.accessToken, storedAnonymousToken);
          backendSession = upgraded.session || null;
          writeAnonymousToken(null);
        } catch {
          writeAnonymousToken(null);
        }
      }

      if (auth.user && auth.accessToken && !backendSession) {
        try {
          const recent = await fetchRecentAuthenticatedSession(auth.accessToken);
          backendSession = recent.session || null;
        } catch {
          backendSession = null;
        }
      }

      if (auth.user && auth.accessToken && !backendSession) {
        const created = await createAnonymousSession();
        if (created?.anonymousToken) {
          const upgraded = await upgradeAnonymousSession(auth.accessToken, created.anonymousToken);
          backendSession = upgraded.session || created.session || null;
        } else {
          backendSession = created.session || null;
        }
      }

      if (!backendSession) {
        const initialized = await initializeFlowfexSession();
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
          configured: isSupabaseBrowserConfigured(),
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
          configured: isSupabaseBrowserConfigured(),
          error: error instanceof Error ? error.message : 'Unable to initialize the Flowfex session.',
        }));
        syncStore(null, null);
      });
      return null;
    }
  }, [refreshUsage, syncStore]);

  useEffect(() => {
    initialize().catch(() => {
      return;
    });
  }, [initialize]);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      return undefined;
    }

    const subscription = onAuthStateChange((payload) => {
      if (!['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED'].includes(payload.event)) {
        return;
      }

      initialize({
        forceAnonymous: payload.event === 'SIGNED_OUT',
      }).catch(() => {
        return;
      });
    });

    return () => {
      subscription.unsubscribe();
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
    if (isSupabaseBrowserConfigured()) {
      await signOutFromSupabase();
    }

    writeAnonymousToken(null);
    await initialize({ forceAnonymous: true });
  }, [initialize]);

  const hasConnectedAgent = useMemo(() => {
    if (connectedAgents.length > 0) {
      return true;
    }

    if (Array.isArray(state.session?.connectedAgents) && state.session.connectedAgents.length > 0) {
      return true;
    }

    return Array.isArray(state.session?.graphState?.connectedAgents)
      && state.session.graphState.connectedAgents.length > 0;
  }, [connectedAgents.length, state.session]);

  const value = useMemo(() => ({
    ...state,
    hasConnectedAgent,
    refreshSession: () => initialize(),
    refreshUsage: () => refreshUsage(),
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
