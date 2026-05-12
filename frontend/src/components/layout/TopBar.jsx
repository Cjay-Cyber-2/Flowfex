import React from 'react';
import { ChevronDown, Pause, Play, ShieldCheck, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import FlowfexLogoNew from '../FlowfexLogoNew';
import useStore from '../../store/useStore';
import { useSessionContext } from '../../context/SessionContext';
import './TopBar.css';

function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, hasConnectedAgent, user: sessionUser } = useSessionContext();
  const {
    activeSession,
    canvasMode,
    isExecuting,
    nodes,
    apiPauseSession,
    apiResumeSession,
    setCanvasMode,
    setConnectModalOpen,
    updateSessionName,
    user,
  } = useStore();

  const currentNode =
    nodes.find((node) => node.state === 'approval') ||
    nodes.find((node) => node.state === 'active') ||
    null;

  const modes = [
    { id: 'map', label: 'Map' },
    { id: 'flow', label: 'Flow' },
    { id: 'live', label: 'Live' },
  ];

  const displayEmail = sessionUser?.email || user?.email || '';
  const displayUsername = String(sessionUser?.name || user?.name || '').trim();
  const accountLabel = isAuthenticated
    ? (displayUsername || (displayEmail ? displayEmail.split('@')[0] : '') || 'Signed in')
    : 'Anonymous';
  const accountTitle = isAuthenticated
    ? (displayEmail ? `Signed in as ${displayUsername || displayEmail}` : 'Signed in to Flowfex')
    : 'Anonymous Flowfex session — connect an agent to orchestrate. Sign up after your free requests for a saved account and higher limits.';
  const avatarLetters = isAuthenticated ? (user?.initials || '').trim() : '';

  const connectDisabled = !isAuthenticated && hasConnectedAgent;

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="top-bar-brand" onClick={() => navigate('/')}>
          <FlowfexLogoNew size={32} animated={false} />
        </button>

        <div className="session-editor">
          <span className="top-bar-kicker">Session</span>
          <input
            aria-label="Session name"
            className="session-editor-input"
            value={activeSession?.name || 'Untitled Session'}
            onChange={(event) => updateSessionName(event.target.value)}
          />
        </div>
      </div>

      <div className="top-bar-center">
        <div className={`status-strip ${currentNode ? 'is-live' : ''}`}>
          <span className="status-strip-pulse" />
          <div className="status-strip-copy">
            <span className="top-bar-kicker">
              {activeSession?.status === 'waiting' ? 'Waiting for agent' : 'Live session'}
            </span>
            <div className="status-strip-mainline">
              <strong>{activeSession?.heartbeat || currentNode?.title || 'Ready to orchestrate'}</strong>
              <span className={`status-strip-mode status-strip-mode-${canvasMode}`}>{canvasMode.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="top-bar-right">
        <div className="mode-toggle">
          {modes.map((mode) => (
            <button
              key={mode.id}
              className={`mode-btn ${canvasMode === mode.id ? 'active' : ''}`}
              onClick={() => setCanvasMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <button
          className={`top-bar-icon-button ${isExecuting ? 'is-active' : ''}`}
          onClick={() => (isExecuting ? apiPauseSession() : apiResumeSession())}
          aria-label={isExecuting ? 'Pause execution' : 'Resume execution'}
          title={isExecuting ? 'Pause execution' : 'Resume execution'}
        >
          {isExecuting ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          type="button"
          className="top-bar-connect"
          disabled={connectDisabled}
          onClick={() => {
            if (!connectDisabled) {
              setConnectModalOpen(true);
            }
          }}
          title={
            connectDisabled
              ? 'Anonymous sessions support one connected agent. Sign in to add more on a paid plan.'
              : hasConnectedAgent
                ? (isAuthenticated ? 'Connect or manage additional agents' : 'Your agent is connected')
                : 'Connect an agent to Flowfex'
          }
        >
          {hasConnectedAgent
            ? (isAuthenticated ? 'Manage Agents' : 'Agent connected')
            : 'Connect Agent'}
        </button>

        <span
          className={`top-bar-account-badge ${isAuthenticated ? 'is-auth' : 'is-anon'}`}
          title={accountTitle}
        >
          {isAuthenticated ? <ShieldCheck size={12} /> : <UserRound size={12} />}
          {accountLabel}
        </span>

        <button
          type="button"
          className="top-bar-account"
          onClick={() => navigate('/settings', { state: { from: `${location.pathname}${location.search}` } })}
          aria-label="Account and settings"
        >
          <span className={`top-bar-account-avatar ${!avatarLetters ? 'is-empty' : ''}`}>{avatarLetters}</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}

export default TopBar;
