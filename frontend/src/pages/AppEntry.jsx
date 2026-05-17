import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext';
import SyniqLogoNew from '../components/SyniqLogoNew';

/**
 * Product entry URL from marketing (`/app`). Resolves server-backed gates and
 * sends users to the dashboard only when a live agent is verified; otherwise
 * onboarding to connect.
 */
export default function AppEntry() {
  const { sessionReady, appState, refreshAppState } = useSessionContext();
  const retriedRef = useRef(false);

  useEffect(() => {
    if (!sessionReady || appState || retriedRef.current) {
      return undefined;
    }
    retriedRef.current = true;
    refreshAppState().catch(() => {});
    return undefined;
  }, [sessionReady, appState, refreshAppState]);

  if (!sessionReady) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--color-eigengrau)',
          color: 'var(--color-bistre)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <SyniqLogoNew size={36} animated={false} />
        <span>Preparing your workspace…</span>
      </div>
    );
  }

  const allowDashboard = appState?.gates?.allowDashboard === true
    || appState?.gates?.agentConnectedServer === true;

  if (allowDashboard) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/onboarding" replace />;
}
