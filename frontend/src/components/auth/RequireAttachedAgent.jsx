import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionContext } from '../../context/SessionContext';
import useStore from '../../store/useStore';
import { isLiveConnectedAgent } from '../../utils/agentPresence';

/**
 * Strict route guard for /dashboard.
 *
 * The dashboard opens only when this browser's Syniq session has a
 * **verified live agent** (store mirror + server session snapshot).
 */
export default function RequireAttachedAgent({ children }) {
  const location = useLocation();
  const { sessionReady, hasConnectedAgent } = useSessionContext();
  const connectedAgents = useStore((state) => state.connectedAgents);
  const localHasConnectedAgent = connectedAgents.some(isLiveConnectedAgent);
  if (!sessionReady) {
    return <Navigate to="/onboarding" replace />;
  }

  const verifiedAgent = hasConnectedAgent || localHasConnectedAgent;
  if (verifiedAgent) {
    return children;
  }

  return <Navigate to="/onboarding" replace state={{ from: location }} />;
}
