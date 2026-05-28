import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { CONNECT_LINK, CONNECT_LIVE_SNIPPET, CONNECT_PROMPT, CONNECT_SDK_SNIPPET } from '../store/demoData';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import {
  getBackendOrigin,
  getConnectEndpointPath,
  normalizeSessionConnectUrl,
  resolveApiFetchBase,
  rewriteConnectPrompt,
} from '../utils/runtimeConfig';
import {
  buildSyniqMcpServerConfig,
  resolveMcpCredentialsFromConnection,
  stringifyMcpConfig,
} from '../utils/mcpConfig';
import { CONNECT_SETUP_STEPS, ConnectSetupStep } from '../utils/connectSetupSteps';
import { rotateAnonymousWorkspaceSession } from '../../../lib/session/initialize';
import '../styles/landing-sections3.css';

const TABS = ['Prompt', 'MCP', 'Link', 'SDK', 'Live Channel'];
const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  reconnectionAttempts: Infinity,
  timeout: 20000,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  withCredentials: true,
};

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return [copied, copy];
}

function formatConnectFetchError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  const isNetworkFailure =
    error instanceof TypeError
    || /NetworkError|Failed to fetch|fetch resource|ECONNREFUSED|load failed/i.test(message);

  if (!isNetworkFailure) {
    return message || 'Connection bootstrap failed';
  }

  if (import.meta.env.DEV) {
    return 'Cannot reach the local Syniq API. Start the backend on port 4000 (`cd backend && npm start`), then try again.';
  }

  return 'Cannot reach the Syniq API right now. Please try again in a moment.';
}

async function readConnectResponse(response) {
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      hasBody: false,
      payload: null,
    };
  }

  try {
    return {
      hasBody: true,
      payload: JSON.parse(trimmed),
    };
  } catch {
    return {
      hasBody: true,
      payload: null,
    };
  }
}

function CopyBtn({ text, style, className = '' }) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      className={`cam-copy-btn${className ? ` ${className}` : ''}`}
      style={style}
      onClick={() => copy(text)}
    >
      {copied ? <><CheckCheck size={14} style={{ marginRight: 5 }} />Copied</> : <><Copy size={14} style={{ marginRight: 5 }} />Copy</>}
    </button>
  );
}

function ConcealedPayload({ text, title, emptyMessage = 'Preparing connection details…' }) {
  const [copied, copy] = useCopy();
  const [revealed, setRevealed] = useState(false);

  if (!text?.trim()) {
    return (
      <div className="cam-payload-card cam-payload-card--empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const handleCopy = () => {
    copy(text);
    setRevealed(true);
  };

  return (
    <div className="cam-payload-card">
      <div className="cam-payload-card__intro">
        <span className="cam-payload-card__title">{title}</span>
        <p>Click Copy, then paste into your agent.</p>
      </div>
      <button type="button" className="cam-payload-copy-btn" onClick={handleCopy}>
        {copied ? (
          <>
            <CheckCheck size={16} />
            Copied — paste into your agent
          </>
        ) : (
          <>
            <Copy size={16} />
            Copy
          </>
        )}
      </button>
      <div className={`cam-payload-preview${revealed ? ' cam-payload-preview--revealed' : ''}`}>
        <pre>{text}</pre>
      </div>
    </div>
  );
}

function ConnectionLimitPanel({
  isAuthenticated,
  message,
  limitKey,
  onSignUp,
  onSignIn,
  onClose,
  onViewPricing,
  onStartFreshSession,
}) {
  const headline = limitKey === 'maxExecutionsPerSession'
    ? 'Free request limit reached'
    : limitKey === 'maxConnectionsPerDay'
      ? 'Daily attach limit reached'
      : limitKey === 'maxConcurrentAgents'
        ? 'Agent slot in use'
        : 'Connection unavailable';

  if (isAuthenticated) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="cam-security-note" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(0, 212, 170, 0.18)', background: 'rgba(8, 32, 28, 0.55)' }}>
          <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-velin)' }}>
            {headline}
          </strong>
          <span>{message || 'Your authenticated dashboard stays open. Wait for the daily reset, or upgrade for more connections.'}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="cam-done-btn" onClick={onViewPricing}>Upgrade Plan</button>
          <button type="button" className="cam-copy-btn" onClick={onClose}>Wait For Reset</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="cam-security-note" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(0, 212, 170, 0.24)', background: 'rgba(8, 32, 28, 0.55)' }}>
        <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-velin)' }}>
          {headline}
        </strong>
        <span>{message}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {onStartFreshSession ? (
          <button type="button" className="cam-done-btn" onClick={onStartFreshSession}>Start fresh session</button>
        ) : null}
        <button type="button" className="cam-done-btn" onClick={onSignUp}>Sign Up</button>
        <button type="button" className="cam-copy-btn" onClick={onSignIn}>Sign In</button>
      </div>
    </div>
  );
}

function ConnectionMethodShell({ method, children, actions, error }) {
  const steps = CONNECT_SETUP_STEPS[method] || [];

  return (
    <div className="cam-method">
      <h3 className="cam-method-title">{method} setup</h3>
      <p className="cam-connect-headline">
        Your dashboard opens only after Syniq verifies a real agent connection for this session.
      </p>
      <ol className="cam-method-steps">
        {steps.map((step, index) => (
          <li key={`step-${index}`}>
            <ConnectSetupStep step={step} />
          </li>
        ))}
      </ol>
      <div className="cam-method-attach">{children}</div>
      {actions}
      {error ? <p className="cam-security-note cam-security-note--error">{error}</p> : null}
    </div>
  );
}

function ConnectionRefreshAction({ loading, label, onRefresh }) {
  return (
    <button type="button" className="cam-text-link" onClick={onRefresh} disabled={loading}>
      <RefreshCw size={13} /> {loading ? 'Refreshing…' : label}
    </button>
  );
}

function PromptTab({
  connection, loading, onRefresh, error, limitState, limitKey,
  isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing, onStartFreshSession,
}) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        limitKey={limitKey}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
        onStartFreshSession={onStartFreshSession}
      />
    );
  }

  if (!connection?.connection?.instructions?.prompt && loading) {
    return (
      <div>
        <p className="cam-tab-desc">Preparing a secure connection prompt for your agent...</p>
        <div className="cam-payload-card cam-payload-card--empty">
          <p>Generating session…</p>
        </div>
      </div>
    );
  }

  const rawPrompt = connection?.connection?.instructions?.prompt || CONNECT_PROMPT;
  const sessionUrl = connection?.connection?.instructions?.sessionUrl
    || connection?.connection?.link?.url;
  const promptText = rewriteConnectPrompt(rawPrompt, sessionUrl);
  return (
    <ConnectionMethodShell
      method="Prompt"
      error={error}
      actions={<ConnectionRefreshAction loading={loading} label="Refresh session" onRefresh={onRefresh} />}
    >
      <ConcealedPayload text={promptText} title="Connection contract" />
    </ConnectionMethodShell>
  );
}

function LinkTab({
  connection, loading, onRefresh, error, limitState, limitKey,
  isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing, onStartFreshSession,
}) {
  const [copied, copy] = useCopy();

  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        limitKey={limitKey}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
        onStartFreshSession={onStartFreshSession}
      />
    );
  }

  if (!connection?.connection?.link?.url && loading) {
    return (
      <div>
        <p className="cam-tab-desc">Generating a secure one-time connection link...</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, opacity: 0.6 }}>
          <input readOnly value="Generating link..." className="cam-readonly-input" />
        </div>
      </div>
    );
  }

  const url = normalizeSessionConnectUrl(connection?.connection?.link?.url || CONNECT_LINK);
  return (
    <ConnectionMethodShell
      method="Link"
      error={error}
      actions={<ConnectionRefreshAction loading={loading} label="Regenerate link" onRefresh={onRefresh} />}
    >
      <div className="cam-link-row">
        <input readOnly value={url} className="cam-readonly-input" aria-label="Attach link" />
        <button type="button" className="cam-copy-btn cam-copy-btn--compact" onClick={() => copy(url)}>
          {copied ? <><CheckCheck size={14} style={{ marginRight: 4 }} />Copied</> : <><Copy size={14} style={{ marginRight: 4 }} />Copy</>}
        </button>
      </div>
    </ConnectionMethodShell>
  );
}

function SDKTab({
  connection, loading, onRefresh, error, limitState, limitKey,
  isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing, onStartFreshSession,
}) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        limitKey={limitKey}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
        onStartFreshSession={onStartFreshSession}
      />
    );
  }

  if (!connection?.connection?.instructions?.sdkSnippet && loading) {
    return (
      <div>
        <p className="cam-tab-desc">Preparing SDK connection snippet...</p>
        <div className="cam-payload-card cam-payload-card--empty">
          <p>Generating unique session credentials…</p>
        </div>
      </div>
    );
  }

  const snippet = connection?.connection?.instructions?.sdkSnippet || CONNECT_SDK_SNIPPET;
  return (
    <ConnectionMethodShell
      method="SDK"
      error={error}
      actions={<ConnectionRefreshAction loading={loading} label="Refresh session" onRefresh={onRefresh} />}
    >
      <ConcealedPayload text={snippet} title="SDK snippet" />
    </ConnectionMethodShell>
  );
}

function LiveChannelTab({
  connection, loading, onRefresh, error, limitState, limitKey,
  isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing, onStartFreshSession,
}) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        limitKey={limitKey}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
        onStartFreshSession={onStartFreshSession}
      />
    );
  }

  if (!connection?.connection?.instructions?.endpointPayload && loading) {
    return (
      <div>
        <p className="cam-tab-desc">Preparing Live Channel connection payload...</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, opacity: 0.6 }}>
          <input readOnly value="Generating live channel snippet..." className="cam-readonly-input" />
        </div>
      </div>
    );
  }

  const endpoint = connection?.connection?.instructions?.endpointPayload || CONNECT_LIVE_SNIPPET;
  return (
    <ConnectionMethodShell
      method="Live Channel"
      error={error}
      actions={<ConnectionRefreshAction loading={loading} label="Refresh live channel" onRefresh={onRefresh} />}
    >
      <ConcealedPayload text={endpoint} title="Live channel payload" />
    </ConnectionMethodShell>
  );
}


function MCPTab({
  connection, loading, onRefresh, error, limitState, limitKey,
  isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing, onStartFreshSession,
  workspaceSessionId,
}) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        limitKey={limitKey}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
        onStartFreshSession={onStartFreshSession}
      />
    );
  }

  const credentials = resolveMcpCredentialsFromConnection(connection, workspaceSessionId);
  const waitingForCredentials = loading || !credentials.ready;

  if (waitingForCredentials) {
    return (
      <ConnectionMethodShell method="MCP" error={null} actions={null}>
        <p className="cam-tab-desc">Preparing your personal MCP config with session ID and token…</p>
        <div className="cam-payload-card cam-payload-card--empty">
          <p>Waiting for session credentials…</p>
        </div>
        <ConnectionRefreshAction loading={loading} label="Refresh session" onRefresh={onRefresh} />
      </ConnectionMethodShell>
    );
  }

  const publicOrigin = getBackendOrigin().replace(/\/+$/, '');
  const ingestUrl = connection?.connection?.session?.endpoints?.ingest || `${publicOrigin}/ingest`;
  const mcpConfig = buildSyniqMcpServerConfig({
    publicUrl: publicOrigin,
    sessionId: credentials.sessionId,
    sessionToken: credentials.sessionToken,
    ingestUrl,
  });
  const mcpText = stringifyMcpConfig(mcpConfig);

  const devNote = import.meta.env.DEV
    ? '\n\n// Local dev: replace command with node mcp/syniq-mcp/src/index.js'
    : '';

  return (
    <ConnectionMethodShell
      method="MCP"
      error={error}
      actions={<ConnectionRefreshAction loading={loading} label="Refresh session" onRefresh={onRefresh} />}
    >
      <p className="cam-credential-note">
        Session ID and token are inside the JSON under <code>env</code> — copy the whole block.
      </p>
      <ConcealedPayload text={`${mcpText}${devNote}`} title="MCP configuration" />
    </ConnectionMethodShell>
  );
}

const TAB_CONTENT = { Prompt: PromptTab, MCP: MCPTab, Link: LinkTab, SDK: SDKTab, 'Live Channel': LiveChannelTab };

function ConnectAgentModal({
  isOpen,
  onClose,
  onConnected,
  initialTab = 'Prompt',
  lockedTab = null,
}) {
  const navigate = useNavigate();
  const addAgent = useStore((state) => state.addAgent);
  const activeSession = useStore((state) => state.activeSession);
  const apiFetchBase = resolveApiFetchBase();
  const socketBase = getBackendOrigin().replace(/\/+$/, '');
  const {
    accessToken,
    isAuthenticated,
    refreshUsage,
    refreshAppState,
    refreshSession,
    session,
    usage: sessionUsage,
    hasConnectedAgent,
    appState,
  } = useSessionContext();
  const [activeTab, setActiveTab] = useState('Prompt');
  const [connections, setConnections] = useState({});
  const [errors, setErrors] = useState({});
  const [limitMessages, setLimitMessages] = useState({});
  const [limitKeys, setLimitKeys] = useState({});
  const [loadingTabs, setLoadingTabs] = useState({});
  const [syncState, setSyncState] = useState('idle');
  const fetchAttemptedRef = useRef(new Set());
  const finalizedConnectionKeysRef = useRef(new Set());
  const TabContent = TAB_CONTENT[activeTab];
  const isPaidAccount = appState?.identity?.billing === 'pro';
  const workspaceSessionId = activeSession?.id || session?.id || null;
  const resolvedTab = lockedTab && TABS.includes(lockedTab)
    ? lockedTab
    : (initialTab && TABS.includes(initialTab) ? initialTab : 'Prompt');

  const requestForTab = useCallback((tab) => {
    switch (tab) {
      case 'Prompt':
        return {
          sessionId: workspaceSessionId,
          mode: 'prompt',
          prompt: 'Attach this agent to Syniq for the full conversation and route every request through Syniq before acting.',
          agent: { name: 'Prompt Agent', type: 'prompt' },
        };
      case 'MCP':
        return {
          sessionId: workspaceSessionId,
          mode: 'prompt',
          prompt: 'Attach this agent to Syniq via MCP for the full conversation and route every request through Syniq before acting.',
          agent: { name: 'MCP Agent', type: 'mcp' },
        };
      case 'Link':
        return {
          sessionId: workspaceSessionId,
          mode: 'link',
          singleUse: true,
          agent: { name: 'Link Agent', type: 'link' },
        };
      case 'SDK':
        return {
          sessionId: workspaceSessionId,
          mode: 'sdk',
          agent: { name: 'SDK Agent', type: 'sdk' },
        };
      case 'Live Channel':
        return {
          sessionId: workspaceSessionId,
          mode: 'live',
          protocol: 'socket.io',
          agent: { name: 'Live Channel Agent', type: 'live' },
        };
      default:
        return null;
    }
  }, [workspaceSessionId]);

  const fetchConnection = useCallback(async (tab) => {
    const request = requestForTab(tab);
    if (!request) {
      return;
    }

    if (!workspaceSessionId) {
      setErrors((current) => ({
        ...current,
        [tab]: 'Workspace session is still loading. Wait a moment, then try again.',
      }));
      return;
    }

    setLoadingTabs((current) => ({ ...current, [tab]: true }));
    setErrors((current) => ({ ...current, [tab]: null }));
    setLimitMessages((current) => ({ ...current, [tab]: null }));

    const apiBase = resolveApiFetchBase();

    try {
      const response = await fetch(`${apiBase}${getConnectEndpointPath()}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(!accessToken && session?.anonymousToken ? { 'X-Syniq-Anonymous-Token': session.anonymousToken } : {}),
        },
        body: JSON.stringify(request),
      });
      const { hasBody, payload } = await readConnectResponse(response);

      if (!response.ok) {
        const nextError = new Error(payload?.error?.message || 'Connection bootstrap failed');
        nextError.statusCode = response.status;
        nextError.payload = payload;
        throw nextError;
      }

      if (!hasBody) {
        throw new Error('Connection bootstrap returned an empty response');
      }

      if (!payload) {
        throw new Error('Connection bootstrap returned an unreadable response');
      }

      if (!payload.connection) {
        throw new Error('Connection bootstrap returned incomplete session data');
      }

      setConnections((current) => ({
        ...current,
        [tab]: payload,
      }));
    } catch (error) {
      const connectionLimit = error?.payload?.error?.details?.connectionBlockedLimit;
      const limitMessage = connectionLimit?.reason || null;

      if (limitMessage) {
        setLimitMessages((current) => ({
          ...current,
          [tab]: limitMessage,
        }));
        setLimitKeys((current) => ({
          ...current,
          [tab]: connectionLimit?.limit || null,
        }));
      }

      setErrors((current) => ({
        ...current,
        [tab]: formatConnectFetchError(error),
      }));
    } finally {
      setLoadingTabs((current) => ({ ...current, [tab]: false }));
    }
  }, [accessToken, apiFetchBase, requestForTab, session?.anonymousToken]);

  // Surface session-level request/attach exhaustion in the modal too so the
  // user sees the same sign-up wall whether they hit the cap from the
  // dashboard or from this connect dialog.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const executionLimit = sessionUsage?.blockedLimit?.limit === 'maxExecutionsPerSession'
      ? sessionUsage.blockedLimit
      : null;
    const connectionLimit = sessionUsage?.connectionBlockedLimit || null;

    const reqReason = connectionLimit?.reason
      || executionLimit?.reason
      || null;
    const reqLimitKey = connectionLimit?.limit || executionLimit?.limit || null;

    const anonymousAlreadyAttached = !isAuthenticated && hasConnectedAgent
      ? 'You already have one anonymous Syniq attach today. Sign in to manage multiple agents on a paid plan.'
      : null;
    const authenticatedSingleAgentLimit = isAuthenticated && !isPaidAccount && hasConnectedAgent
      ? 'Your free account already has a connected agent. Upgrade to attach another agent, or keep using the current dashboard until your requests renew tomorrow.'
      : null;

    const message = reqReason || anonymousAlreadyAttached || authenticatedSingleAgentLimit;
    const limitKey = reqLimitKey
      || (anonymousAlreadyAttached ? 'maxConcurrentAgents' : null)
      || (authenticatedSingleAgentLimit ? 'maxConcurrentAgents' : null);

    if (!message) {
      setLimitMessages({});
      setLimitKeys({});
      return undefined;
    }

    const nextMessages = {};
    const nextKeys = {};
    TABS.forEach((tab) => {
      nextMessages[tab] = message;
      nextKeys[tab] = limitKey;
    });
    setLimitMessages(nextMessages);
    setLimitKeys(nextKeys);
    return undefined;
  }, [
    isOpen,
    isAuthenticated,
    hasConnectedAgent,
    sessionUsage?.blockedLimit,
    sessionUsage?.connectionBlockedLimit,
    isPaidAccount,
  ]);

  const handleStartFreshSession = useCallback(async () => {
    try {
      await rotateAnonymousWorkspaceSession({ apiBaseUrl: resolveApiFetchBase() });
      await refreshSession();
      setLimitMessages({});
      setLimitKeys({});
      setErrors({});
      fetchAttemptedRef.current = new Set();
    } catch {
      /* ignore */
    }
  }, [refreshSession]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (TABS.includes(resolvedTab)) {
      setActiveTab(resolvedTab);
    }
  }, [resolvedTab, isOpen]);

  const finalizeConnection = useCallback(async (tab, eventData = null) => {
    const connection = connections[tab];
    const connectionSession = connection?.connection?.session;
    const connectionKey = connectionSession
      ? `${connectionSession.id}:${connectionSession.token || connectionSession.connectionId || tab}`
      : null;
    if (!connectionSession || !connectionKey || finalizedConnectionKeysRef.current.has(connectionKey)) {
      return;
    }

    finalizedConnectionKeysRef.current.add(connectionKey);

    setSyncState('connected');

    addAgent({
      id: eventData?.agentId || connectionSession.agent?.id || `agent-${connectionSession.id}`,
      name: eventData?.agentName || connectionSession.agent?.name || `${tab} Agent`,
      type: eventData?.connectionType || tab,
      status: 'connected',
      lastSeen: new Date().toISOString(),
    });

    // Keep the persisted workspace session as active — do not swap in the ephemeral
    // connection bootstrap id or refresh/navigation will drop the verified attach.
    if (onConnected) {
      onConnected();
    } else {
      onClose();
    }

    const usageSessionId = workspaceSessionId || connectionSession.id;
    await refreshUsage(usageSessionId).catch(() => null);
    await refreshAppState().catch(() => null);
  }, [addAgent, connections, onClose, onConnected, refreshAppState, refreshUsage, workspaceSessionId]);

  const handleSignUp = useCallback(() => {
    onClose();
    navigate('/signup');
  }, [navigate, onClose]);

  const handleSignIn = useCallback(() => {
    onClose();
    navigate('/signin');
  }, [navigate, onClose]);

  const handleViewPricing = useCallback(() => {
    onClose();
    navigate('/pricing');
  }, [navigate, onClose]);

  useEffect(() => {
    if (!isOpen || !workspaceSessionId) {
      return;
    }

    if (!connections[activeTab] && !loadingTabs[activeTab] && !fetchAttemptedRef.current.has(activeTab)) {
      fetchAttemptedRef.current.add(activeTab);
      fetchConnection(activeTab);
    }
  }, [activeTab, connections, fetchConnection, isOpen, loadingTabs, workspaceSessionId]);

  useEffect(() => {
    if (workspaceSessionId) {
      return;
    }
    fetchAttemptedRef.current = new Set();
  }, [workspaceSessionId]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab(resolvedTab);
      setConnections({});
      setSyncState('idle');
      setErrors({});
      setLimitMessages({});
      setLoadingTabs({});
      fetchAttemptedRef.current = new Set();
      finalizedConnectionKeysRef.current = new Set();
      return undefined;
    }

    if (lockedTab && TABS.includes(lockedTab) && activeTab !== lockedTab) {
      setActiveTab(lockedTab);
    }

    const connectionSession = connections[activeTab]?.connection?.session;
    const socketSessionId = workspaceSessionId || connectionSession?.id;
    if (!socketSessionId || !socketBase) {
      setSyncState('idle');
      return undefined;
    }

    setSyncState('waiting');
    const socket = io(`${socketBase}/session`, {
      ...SOCKET_OPTIONS,
      query: { sessionId: socketSessionId },
    });

    socket.on('agent:connected', (eventData) => {
      if (!eventData) {
        return;
      }

      const eventSessionId = eventData.sessionId;
      const matchesWorkspace = workspaceSessionId && eventSessionId === workspaceSessionId;
      const matchesConnection = connectionSession?.id && eventSessionId === connectionSession.id;
      if (!matchesWorkspace && !matchesConnection) {
        return;
      }

      setSyncState('connected');
      window.setTimeout(() => finalizeConnection(activeTab, eventData), 320);
    });

    socket.on('connect_error', () => {
      setSyncState((current) => (current === 'connected' ? current : 'waiting'));
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTab, socketBase, connections, finalizeConnection, initialTab, isOpen, workspaceSessionId]);

  /** HTTP fallback: if agent:connected is missed (WS timing, proxies), poll session after an 8s grace window. */
  useEffect(() => {
    if (!isOpen || syncState !== 'waiting') {
      return undefined;
    }

    const sess = connections[activeTab]?.connection?.session;
    const token = sess?.token;
    if (!sess?.id || !token) {
      return undefined;
    }

    let cancelled = false;
    let intervalId = null;
    const baseUrl = apiFetchBase;
    const maxAttempts = 80;

    const tick = async () => {
      if (cancelled) {
        return;
      }
      try {
        const response = await fetch(`${baseUrl}/sessions/${sess.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (!response.ok || cancelled) {
          return;
        }
        const payload = await response.json();
        if (payload?.session?.connectedAt && !cancelled) {
          finalizeConnection(activeTab, {
            sessionId: sess.id,
            agentId: payload.session.agent?.id,
            agentName: payload.session.agent?.name,
            connectionType: activeTab,
          });
        }
      } catch {
        /* ignore */
      }
    };

    const delayId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      let attempts = 0;
      const run = async () => {
        if (cancelled || attempts >= maxAttempts) {
          if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        attempts += 1;
        await tick();
      };
      run();
      intervalId = window.setInterval(run, 2500);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(delayId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeTab, apiFetchBase, connections, finalizeConnection, initialTab, isOpen, syncState]);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <>
          <motion.div
            className="cam-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="cam-modal-wrapper">
            <motion.div
              className="cam-modal"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.8 }}
            >
            <div className={`cam-header${lockedTab ? ' cam-header--minimal' : ''}`}>
              {!lockedTab ? (
                <div>
                  <h2 className="cam-title">Connect your agent</h2>
                  <p className="cam-subtitle">Pick a connection method.</p>
                </div>
              ) : (
                <div className="cam-header__spacer" aria-hidden />
              )}
              <button type="button" className="cam-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>

            {!lockedTab ? (
              <div className="cam-tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`cam-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            ) : null}

            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="cam-tab-body"
              >
                <TabContent
                  connection={connections[activeTab]}
                  loading={loadingTabs[activeTab]}
                  onRefresh={() => fetchConnection(activeTab)}
                  error={errors[activeTab]}
                  limitState={limitMessages[activeTab]}
                  limitKey={limitKeys[activeTab]}
                  workspaceSessionId={workspaceSessionId}
                  isAuthenticated={isAuthenticated}
                  onSignUp={handleSignUp}
                  onSignIn={handleSignIn}
                  onClose={onClose}
                  onViewPricing={handleViewPricing}
                  onStartFreshSession={!isAuthenticated ? handleStartFreshSession : undefined}
                />
              </motion.div>
            </AnimatePresence>

            <div className="cam-footer">
              <div className="cam-sync-status">
                <span className={`cam-sync-dot cam-sync-dot-${syncState === 'connected' ? 'live' : 'waiting'}`} />
                <span>
                  {syncState === 'connected'
                    ? 'Connected. Opening your dashboard.'
                    : 'Waiting for the agent to connect…'}
                </span>
              </div>
              <button className="cam-done-btn" onClick={onClose}>Done</button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConnectAgentModal;
