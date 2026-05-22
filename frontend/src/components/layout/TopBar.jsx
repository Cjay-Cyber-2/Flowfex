import React from 'react';
import { ChevronDown, Pause, Play, ShieldCheck, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import SyniqLogoNew from '../SyniqLogoNew';
import useStore from '../../store/useStore';
import { useSessionContext } from '../../context/SessionContext';
import { sanitizeWorkspaceTaskText } from '../../utils/sessionDisplay';
import { filterLiveConnectedAgents } from '../../utils/agentPresence';
import './TopBar.css';

function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, hasConnectedAgent, user: sessionUser, appState } = useSessionContext();
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
    connectedAgents,
    clearAgentAttachment,
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
    ? (displayEmail ? `Signed in as ${displayUsername || displayEmail}` : 'Signed in to Syniq')
    : 'Anonymous Syniq session — connect an agent to orchestrate. Sign up after your free requests for a saved account and higher limits.';
  const avatarLetters = isAuthenticated ? (user?.initials || '').trim() : '';
  const isProAccount = appState?.identity?.billing === 'pro';
  const freeAccountHasAttachedAgent = isAuthenticated && !isProAccount && hasLiveAgent;

  const liveAgents = filterLiveConnectedAgents(connectedAgents);
  const hasLiveAgent = liveAgents.length > 0;
  const hasStaleAgent = connectedAgents.length > 0 && !hasLiveAgent;
  const connectDisabled = !isAuthenticated && hasLiveAgent;

  const openConnectFlow = async () => {
    if (hasStaleAgent) {
      await clearAgentAttachment(activeSession?.id);
    }
    setConnectModalOpen(true);
  };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="top-bar-brand" onClick={() => navigate('/')}>
          <SyniqLogoNew size={56} animated={false} />
        </button>

        <div className="session-editor">
          <span className="top-bar-kicker">Session</span>
          <input
            aria-label="Session name"
            className="session-editor-input"
            value={sanitizeWorkspaceTaskText(activeSession?.name) || 'Syniq Session'}
            onChange={(event) => updateSessionName(sanitizeWorkspaceTaskText(event.target.value) || 'Syniq Session')}
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
        <div className="mode-toggle" data-tour="canvas-modes">
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
          type="button"
          className={`top-bar-run-control ${isExecuting ? 'is-active' : ''}`}
          onClick={() => (isExecuting ? apiPauseSession() : apiResumeSession())}
          aria-label={isExecuting ? 'Pause orchestration run' : 'Resume orchestration run'}
          title={isExecuting ? 'Pause the current orchestration run' : 'Resume the paused orchestration run'}
        >
          {isExecuting ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          <span>{isExecuting ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          type="button"
          className="top-bar-connect"
          disabled={connectDisabled}
          onClick={() => {
            if (!connectDisabled) {
              openConnectFlow();
            }
          }}
          title={
            connectDisabled
              ? 'Anonymous sessions support one connected agent. Sign in to add more on a paid plan.'
              : hasStaleAgent
                ? 'Clear the old agent and connect a new one'
              : freeAccountHasAttachedAgent
                ? 'Free accounts support one connected agent. Upgrade to attach another.'
              : hasLiveAgent
                ? (isAuthenticated ? 'Connect or manage additional agents' : 'Your agent is connected')
                : 'Connect an agent to Syniq'
          }
        >
          {hasStaleAgent
            ? 'Reconnect agent'
            : hasLiveAgent
              ? (isAuthenticated ? (freeAccountHasAttachedAgent ? 'Current Agent' : 'Manage Agents') : 'Agent connected')
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
