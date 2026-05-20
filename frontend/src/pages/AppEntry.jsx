import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext';

/**
 * Marketing CTA entry (`/app`). No blocking splash — route immediately once the
 * session layer has bootstrapped (or send guests to onboarding while it loads).
 */
export default function AppEntry() {
  const { sessionReady, hasConnectedAgent } = useSessionContext();

  if (!sessionReady) {
    return <Navigate to="/onboarding" replace />;
  }

  if (hasConnectedAgent) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/onboarding" replace />;
}
