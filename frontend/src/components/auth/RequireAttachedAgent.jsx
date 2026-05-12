import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/SessionContext';
import useStore from '../../store/useStore';
import FlowfexLogoNew from '../FlowfexLogoNew';
import { isLiveConnectedAgent } from '../../utils/agentPresence';

/**
 * Strict route guard for /dashboard.
 *
 * The dashboard opens only when this browser's Flowfex session has a
 * **verified live agent** (store mirror + server session snapshot).
 * Being signed in with Better Auth is not enough: another laptop with the
 * same account must still complete attach on that device.
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
  const { sessionReady, hasConnectedAgent } = useSessionContext();
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

    const timer = window.setTimeout(() => setGraceExpired(true), 3200);
    return () => window.clearTimeout(timer);
  }, [sessionReady]);

  if (!sessionReady) {
    return <GuardLoading />;
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
