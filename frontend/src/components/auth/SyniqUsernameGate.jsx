import React, { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionContext } from '../../context/SessionContext';
import { userMustChooseSyniqUsername } from '../../services/authService';

const AUTH_PATHS = new Set(['/choose-username', '/signin', '/signup', '/reset-password']);

function resolveInternalReturnPath(from) {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return '/app';
  }
  return from;
}

/**
 * OAuth (and any account with syniqHandleChosen === false) must finish
 * /choose-username before using the rest of the signed-in app.
 */
export default function SyniqUsernameGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionReady, isAuthenticated, user } = useSessionContext();

  useLayoutEffect(() => {
    if (!sessionReady || !isAuthenticated || !user) {
      return;
    }

    const needs = userMustChooseSyniqUsername(user);
    const onChoose = location.pathname === '/choose-username';

    if (needs && !onChoose && !AUTH_PATHS.has(location.pathname)) {
      const path = `${location.pathname}${location.search}`;
      navigate('/choose-username', { replace: true, state: { from: path } });
      return;
    }

    if (!needs && onChoose) {
      navigate(resolveInternalReturnPath(location.state?.from), { replace: true });
    }
  }, [
    sessionReady,
    isAuthenticated,
    user,
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  return null;
}
