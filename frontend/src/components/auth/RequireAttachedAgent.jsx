import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/SessionContext';
import useStore from '../../store/useStore';
import FlowfexLogoNew from '../FlowfexLogoNew';
import { isLiveConnectedAgent } from '../../utils/agentPresence';

/**
 * Strict route guard for /dashboard.
 *
 * The dashboard only opens when EITHER:
 *   1. The session that the *current device* owns shows a verified connected
 *      agent (server-side `connectedAgents`, mirrored into the local store
 *      via SessionContext after backend hydration), OR
 *   2. The visitor is signed in (authenticated cookie + JWT).
 *
 * The fundamental rule the user asked for: if I open this URL on a fresh
 * laptop that has never attached an agent and has not signed in, I must
 * never see the dashboard or its transition. I get the loading shell, then
 * I am sent to /onboarding immediately. No flash, no race.
 */
function GuardLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-eigengrau)',
        color: 'var(--color-bistre)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <FlowfexLogoNew size={32} animated={false} />
        <span>Verifying your Flowfex session…</span>
      </div>
    </div>
  );
}

export default function RequireAttachedAgent({ children }) {
  const location = useLocation();
  const { sessionReady, isAuthenticated, hasConnectedAgent } = useSessionContext();
  const connectedAgents = useStore((state) => state.connectedAgents);
  const localHasConnectedAgent = connectedAgents.some(isLiveConnectedAgent);
  // The OAuth callback can land here while Better Auth is still hydrating
  // the cookie/session. We only honour a 1s grace window in that case so a
  // fresh device cannot ever see the dashboard skeleton.
  const [graceExpired, setGraceExpired] = useState(false);

  useEffect(() => {
    if (!sessionReady) {
      return undefined;
    }

    const timer = window.setTimeout(() => setGraceExpired(true), 1000);
    return () => window.clearTimeout(timer);
  }, [sessionReady]);

  if (!sessionReady) {
    return <GuardLoading />;
  }

  if (isAuthenticated) {
    return children;
  }

  const verifiedAgent = hasConnectedAgent || localHasConnectedAgent;
  if (verifiedAgent) {
    return children;
  }

  if (!graceExpired) {
    return <GuardLoading />;
  }

  return <Navigate to="/onboarding" replace state={{ from: location }} />;
}
