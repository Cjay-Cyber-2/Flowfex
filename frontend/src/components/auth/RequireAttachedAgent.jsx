import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/SessionContext';
import useStore from '../../store/useStore';
import FlowfexLogoNew from '../FlowfexLogoNew';

/**
 * Guard that protects /dashboard so it only renders when there is a real
 * verified connected agent for the current device's session, OR the user is
 * authenticated (authenticated users can land on the dashboard and connect
 * from there). Anonymous visitors with no connected agent are sent to
 * /onboarding to complete a real attach first.
 *
 * This is what stops the "open the dashboard on a fresh laptop" problem.
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
  const localHasConnectedAgent = connectedAgents.length > 0;
  const [graceExpired, setGraceExpired] = useState(false);

  useEffect(() => {
    if (!sessionReady) {
      return undefined;
    }

    const timer = window.setTimeout(() => setGraceExpired(true), 350);
    return () => window.clearTimeout(timer);
  }, [sessionReady]);

  if (!sessionReady) {
    return <GuardLoading />;
  }

  const verifiedAgent = hasConnectedAgent || localHasConnectedAgent;

  if (verifiedAgent) {
    return children;
  }

  if (isAuthenticated) {
    return children;
  }

  if (!graceExpired) {
    return <GuardLoading />;
  }

  return <Navigate to="/onboarding" replace state={{ from: location }} />;
}
