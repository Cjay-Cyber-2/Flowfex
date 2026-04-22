import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useStore from '../store/useStore';
import { onAuthStateChange, signOutUser } from '../services/authService';
import {
  ANONYMOUS_TOKEN_STORAGE_KEY,
  createAnonymousSession,
  fetchRecentSession,
  upgradeAnonymousSession,
  validateAnonymousSession,
} from '../services/sessionApi';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../services/supabaseBrowser';

const SessionContext = createContext({
  session: null,
  user: null,
  sessionReady: false,
  isAuthenticated: false,
  configured: false,
  accessToken: null,
  error: null,
  refreshSession: async () => null,
  signOut: async () => null,
});

function readAnonymousToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ANONYMOUS_TOKEN_STORAGE_KEY);
}

function writeAnonymousToken(token) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(ANONYMOUS_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ANONYMOUS_TOKEN_STORAGE_KEY, token);
}

function deriveDisplayName(user) {
  if (!user) {
    return null;
  }

  return user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split('@')[0]
    || 'Flowfex User';
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

function toCanvasSession(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    name: session.name || (session.authId ? 'Saved Flowfex Session' : 'Anonymous Flowfex Session'),
    task: session.task || 'Live orchestration',
    heartbeat: session.heartbeat || (session.status === 'paused' ? 'Execution paused' : 'Session live'),
    status: session.status || 'active',
    elapsed: 'Just now',
    executionId: session.graphState?.executionId || null,
  };
}

export function SessionProvider({ children }) {
  const setUser = useStore((state) => state.setUser);
  const setActiveSession = useStore((state) => state.setActiveSession);
  const bootstrapWorkspace = useStore((state) => state.bootstrapWorkspace);
  const [state, setState] = useState({
    session: null,
    user: null,
    sessionReady: false,
    isAuthenticated: false,
    configured: isSupabaseConfigured(),
    accessToken: null,
    error: null,
  });

  const syncStore = useCallback((session, user) => {
    setUser(toStoreUser(user));

    if (session) {
      setActiveSession(toCanvasSession(session));
    }

    bootstrapWorkspace();
  }, [bootstrapWorkspace, setActiveSession, setUser]);

  const initialize = useCallback(async (options = {}) => {
    if (!isSupabaseConfigured()) {
      setState({
        session: null,
        user: null,
        sessionReady: true,
        isAuthenticated: false,
        configured: false,
        accessToken: null,
        error: null,
      });
      syncStore(null, null);
      return null;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      throw new Error('Supabase browser client could not be created.');
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }

    const authSession = options.forceAnonymous ? null : data.session;
    const authUser = authSession?.user || null;
    const accessToken = authSession?.access_token || null;
    const storedAnonymousToken = readAnonymousToken();
    let backendSession = null;

    if (authUser && accessToken && storedAnonymousToken) {
      try {
        const upgraded = await upgradeAnonymousSession(accessToken, storedAnonymousToken);
        backendSession = upgraded.session || null;
        writeAnonymousToken(null);
      } catch {
        writeAnonymousToken(null);
      }
    }

    if (authUser && accessToken && !backendSession) {
      try {
        const recent = await fetchRecentSession(accessToken);
        backendSession = recent.session || null;
      } catch {
        backendSession = null;
      }
    }

    if (!backendSession && authUser && accessToken) {
      const created = await createAnonymousSession();
      if (created?.anonymousToken) {
        const upgraded = await upgradeAnonymousSession(accessToken, created.anonymousToken);
        backendSession = upgraded.session || created.session || null;
      }
    }

    if (!backendSession && storedAnonymousToken) {
      try {
        const existing = await validateAnonymousSession(storedAnonymousToken);
        backendSession = existing.session || null;
      } catch {
        backendSession = null;
      }
    }

    if (!backendSession) {
      const created = await createAnonymousSession();
      backendSession = created.session || null;
      writeAnonymousToken(created.anonymousToken || null);
    }

    setState({
      session: backendSession,
      user: authUser,
      sessionReady: true,
      isAuthenticated: Boolean(authUser),
      configured: true,
      accessToken,
      error: null,
    });
    syncStore(backendSession, authUser);

    return backendSession;
  }, [syncStore]);

  useEffect(() => {
    let active = true;

    initialize().catch((error) => {
      if (!active) {
        return;
      }

      setState((current) => ({
        ...current,
        sessionReady: true,
        error: error instanceof Error ? error.message : 'Unable to initialize the Flowfex session.',
      }));
      syncStore(null, null);
    });

    return () => {
      active = false;
    };
  }, [initialize, syncStore]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return undefined;
    }

    return onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESHED') {
        return;
      }

      initialize({
        forceAnonymous: event === 'SIGNED_OUT',
      }).catch((error) => {
        setState((current) => ({
          ...current,
          sessionReady: true,
          error: error instanceof Error ? error.message : 'Unable to refresh the Flowfex session.',
        }));
      });
    });
  }, [initialize]);

  const signOut = useCallback(async () => {
    await signOutUser();
    writeAnonymousToken(null);
    await initialize({ forceAnonymous: true });
  }, [initialize]);

  const value = useMemo(() => ({
    ...state,
    refreshSession: initialize,
    signOut,
  }), [initialize, signOut, state]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
