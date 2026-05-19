import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext';
import SyniqLogoNew from '../components/SyniqLogoNew';

/**
 * Product entry URL from marketing (`/app`). Resolves server-backed gates and
 * sends users to the dashboard only when a live agent is verified; otherwise
 * onboarding to connect.
 *
 * A short timeout prevents the screen from hanging if
 * `appState` never resolves (e.g. network issues, cold start).
 */
const FALLBACK_TIMEOUT_MS = 1200;

export default function AppEntry() {
  const { sessionReady, appState, refreshAppState } = useSessionContext();
  const retriedRef = useRef(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionReady || appState || retriedRef.current) {
      return undefined;
    }
    retriedRef.current = true;
    refreshAppState().catch(() => {});
    return undefined;
  }, [sessionReady, appState, refreshAppState]);

  // Fallback: if appState doesn't resolve within the timeout, redirect
  // to onboarding so the user isn't stuck on a loading screen.
  useEffect(() => {
    if (!sessionReady || appState) {
      return undefined;
    }

    const timer = window.setTimeout(() => setTimedOut(true), FALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [sessionReady, appState]);

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

  // Timed out waiting for appState — send to onboarding
  if (timedOut && !appState) {
    return <Navigate to="/onboarding" replace />;
  }

  // Still waiting for appState
  if (!appState && !timedOut) {
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
