import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { CONNECT_LINK, CONNECT_LIVE_SNIPPET, CONNECT_PROMPT, CONNECT_SDK_SNIPPET } from '../store/demoData';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import { normalizeSessionConnectUrl, rewriteConnectPrompt } from '../utils/runtimeConfig';
import '../styles/landing-sections3.css';

const TABS = ['Prompt', 'Link', 'SDK', 'Live Channel'];
const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  reconnectionAttempts: Infinity,
  timeout: 20000,
  withCredentials: true,
  transports: ['websocket', 'polling'],
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

function CopyBtn({ text, style }) {
  const [copied, copy] = useCopy();
  return (
    <button className="cam-copy-btn" style={style} onClick={() => copy(text)}>
      {copied ? <><CheckCheck size={14} style={{ marginRight: 5 }} />Copied</> : <><Copy size={14} style={{ marginRight: 5 }} />Copy</>}
    </button>
  );
}

function ConcealedPayload({ text, title }) {
  return (
    <div className="cam-code-block cam-code-block-concealed">
      <pre aria-hidden="true">{text}</pre>
      <div className="cam-concealed-overlay">
        <span className="cam-concealed-kicker">{title}</span>
        <p>Copy to reveal, then paste into your agent.</p>
        <CopyBtn text={text} />
      </div>
    </div>
  );
}

function ConnectionLimitPanel({ isAuthenticated, message, onSignUp, onSignIn, onClose, onViewPricing }) {
  if (isAuthenticated) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="cam-security-note" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(0, 212, 170, 0.18)', background: 'rgba(8, 32, 28, 0.55)' }}>
          <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-velin)' }}>
            You have used today's free connections
          </strong>
          <span>{message || 'Your authenticated dashboard stays open. Wait for the daily reset, or upgrade for more connections.'}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="cam-done-btn" onClick={onViewPricing}>Upgrade Plan</button>
          <button className="cam-copy-btn" onClick={onClose}>Wait For Reset</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="cam-security-note" style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(0, 212, 170, 0.24)', background: 'rgba(8, 32, 28, 0.55)' }}>
        <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-velin)' }}>
          Anonymous connection limit reached
        </strong>
        <span>{message}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="cam-done-btn" onClick={onSignUp}>Sign Up</button>
        <button className="cam-copy-btn" onClick={onSignIn}>Sign In</button>
      </div>
    </div>
  );
}

function ConnectionHeadline() {
  return (
    <p className="cam-connect-headline">
      <strong style={{ color: 'var(--color-sinoper)' }}>→</strong> Your dashboard opens only after Syniq verifies a real agent connection for this session.
    </p>
  );
}

function ConnectionProofNote({ mode }) {
  return (
    <p className="cam-security-note">
      {mode}: this card only prepares credentials. Syniq waits for the agent to attach before routing you to the dashboard.
    </p>
  );
}

function PromptTab({ connection, loading, onRefresh, error, limitState, isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing }) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
      />
    );
  }

  if (loading || !connection?.connection?.instructions?.prompt) {
    return (
      <div>
        <p className="cam-tab-desc">Preparing a secure connection prompt for your agent...</p>
        <div className="cam-code-block cam-code-block-concealed" style={{ opacity: 0.6 }}>
          <pre aria-hidden="true">Generating session...</pre>
        </div>
      </div>
    );
  }

  const promptText = connection?.connection?.instructions?.prompt || CONNECT_PROMPT;
  return (
    <div>
      <ConnectionHeadline />
      <ConnectionProofNote mode="Prompt mode" />
      <ConcealedPayload text={promptText} title="Connection contract — copy to reveal" />
      <button className="cam-text-link" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating...' : 'Refresh Session'}
      </button>
      {error ? <p className="cam-security-note" style={{ color: '#ff6b6b' }}>Error: {error}</p> : null}
    </div>
  );
}

function LinkTab({ connection, loading, onRefresh, error, limitState, isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing }) {
  const [copied, copy] = useCopy();

  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
      />
    );
  }

  if (loading || !connection?.connection?.link?.url) {
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
  const hint = connection?.connection?.instructions?.summary
    || 'Open this link once in the agent to attach.';
  return (
    <div>
      <ConnectionHeadline />
      <ConnectionProofNote mode="Link mode" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input readOnly value={url} className="cam-readonly-input" />
        <button className="cam-copy-btn" onClick={() => copy(url)}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <button className="cam-text-link" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating Link...' : 'Regenerate Link'}
      </button>
      <p className="cam-security-note">{hint}</p>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
    </div>
  );
}

function SDKTab({ connection, loading, onRefresh, error, limitState, isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing }) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
      />
    );
  }

  if (loading || !connection?.connection?.instructions?.sdkSnippet) {
    return (
      <div>
        <p className="cam-tab-desc">Preparing SDK connection snippet...</p>
        <div className="cam-code-block cam-code-block-concealed" style={{ opacity: 0.6 }}>
          <pre aria-hidden="true">Generating unique session credentials...</pre>
        </div>
      </div>
    );
  }

  const snippet = connection?.connection?.instructions?.sdkSnippet || CONNECT_SDK_SNIPPET;
  return (
    <div>
      <ConnectionHeadline />
      <ConnectionProofNote mode="SDK mode" />
      <ConcealedPayload text={snippet} title="SDK attach payload hidden until copied" />
      <button className="cam-text-link" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating SDK Session...' : 'Refresh Session'}
      </button>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
    </div>
  );
}

function LiveChannelTab({ connection, loading, onRefresh, error, limitState, isAuthenticated, onSignUp, onSignIn, onClose, onViewPricing }) {
  if (limitState) {
    return (
      <ConnectionLimitPanel
        isAuthenticated={isAuthenticated}
        message={limitState}
        onSignUp={onSignUp}
        onSignIn={onSignIn}
        onClose={onClose}
        onViewPricing={onViewPricing}
      />
    );
  }

  if (loading || !connection?.connection?.instructions?.endpointPayload) {
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
    <div>
      <ConnectionHeadline />
      <ConnectionProofNote mode="Live channel" />
      <ConcealedPayload text={endpoint} title="Live attach payload hidden until copied" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="cam-pulse-dot" />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-bistre)' }}>Ready for connection</span>
      </div>
      <button className="cam-text-link" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Preparing Live Channel...' : 'Refresh Live Channel'}
      </button>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
    </div>
  );
}

const TAB_CONTENT = { Prompt: PromptTab, Link: LinkTab, SDK: SDKTab, 'Live Channel': LiveChannelTab };

function ConnectAgentModal({ isOpen, onClose, onConnected, initialTab = 'Prompt' }) {
  const navigate = useNavigate();
  const addAgent = useStore((state) => state.addAgent);
  const addSession = useStore((state) => state.addSession);
  const setActiveSession = useStore((state) => state.setActiveSession);
  const activeSession = useStore((state) => state.activeSession);
  const backendUrl = useStore((state) => state.backendUrl);
  const {
    accessToken,
    isAuthenticated,
    refreshUsage,
    refreshAppState,
    session,
    usage: sessionUsage,
    hasConnectedAgent,
    appState,
  } = useSessionContext();
  const [activeTab, setActiveTab] = useState('Prompt');
  const [connections, setConnections] = useState({});
  const [errors, setErrors] = useState({});
  const [limitMessages, setLimitMessages] = useState({});
  const [loadingTabs, setLoadingTabs] = useState({});
  const [syncState, setSyncState] = useState('idle');
  const fetchAttemptedRef = useRef(new Set());
  const finalizedConnectionKeysRef = useRef(new Set());
  const TabContent = TAB_CONTENT[activeTab];
  const isPaidAccount = appState?.identity?.billing === 'pro';
  const workspaceSessionId = activeSession?.id || session?.id || null;

  const requestForTab = useCallback((tab) => {
    switch (tab) {
      case 'Prompt':
        return {
          sessionId: workspaceSessionId,
          mode: 'prompt',
          prompt: 'Attach this agent to Syniq for the full conversation and route every request through Syniq before acting.',
          agent: { name: 'Prompt Agent', type: 'prompt' },
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

    setLoadingTabs((current) => ({ ...current, [tab]: true }));
    setErrors((current) => ({ ...current, [tab]: null }));
    setLimitMessages((current) => ({ ...current, [tab]: null }));

    try {
      const response = await fetch(`${backendUrl}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const limitMessage = error?.payload?.error?.details?.connectionBlockedLimit?.reason
        || error?.payload?.error?.details?.blockedLimit?.reason
        || null;

      if (limitMessage) {
        setLimitMessages((current) => ({
          ...current,
          [tab]: limitMessage,
        }));
      }

      setErrors((current) => ({
        ...current,
        [tab]: error instanceof Error ? error.message : 'Connection bootstrap failed',
      }));
    } finally {
      setLoadingTabs((current) => ({ ...current, [tab]: false }));
    }
  }, [accessToken, backendUrl, requestForTab, session?.anonymousToken]);

  // Surface session-level request/attach exhaustion in the modal too so the
  // user sees the same sign-up wall whether they hit the cap from the
  // dashboard or from this connect dialog.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const reqReason =
      sessionUsage?.blockedLimit?.reason
      || sessionUsage?.connectionBlockedLimit?.reason
      || null;

    // Anonymous visitors are allowed exactly one verified attach. If one
    // already exists we surface the sign-in/sign-up wall directly inside
    // the modal so they cannot try to attach a second agent without
    // upgrading.
    const anonymousAlreadyAttached = !isAuthenticated && hasConnectedAgent
      ? 'You already have one anonymous Syniq attach today. Sign in to manage multiple agents on a paid plan.'
      : null;
    const authenticatedSingleAgentLimit = isAuthenticated && !isPaidAccount && hasConnectedAgent
      ? 'Your free account already has a connected agent. Upgrade to attach another agent, or keep using the current dashboard until your requests renew tomorrow.'
      : null;

    const message = reqReason || anonymousAlreadyAttached || authenticatedSingleAgentLimit;
    if (!message) {
      return undefined;
    }

    setLimitMessages((current) => ({
      ...current,
      Prompt: current.Prompt || message,
      Link: current.Link || message,
      SDK: current.SDK || message,
      'Live Channel': current['Live Channel'] || message,
    }));
    return undefined;
  }, [
    isOpen,
    isAuthenticated,
    hasConnectedAgent,
    sessionUsage?.blockedLimit?.reason,
    sessionUsage?.connectionBlockedLimit?.reason,
    isPaidAccount,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (TABS.includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const finalizeConnection = useCallback(async (tab, eventData = null) => {
    const connection = connections[tab];
    const session = connection?.connection?.session;
    const connectionKey = session ? `${session.id}:${session.token || session.connectionId || tab}` : null;
    if (!session || !connectionKey || finalizedConnectionKeysRef.current.has(connectionKey)) {
      return;
    }

    finalizedConnectionKeysRef.current.add(connectionKey);

    setSyncState('connected');

    addAgent({
      id: eventData?.agentId || session.agent?.id || `agent-${session.id}`,
      name: eventData?.agentName || session.agent?.name || `${tab} Agent`,
      type: eventData?.connectionType || tab,
      status: 'connected',
      lastSeen: new Date().toISOString(),
    });
    const sessionRecord = {
      id: session.id,
      name: `${tab} Session`,
      task: 'Connected through Syniq',
      heartbeat: `${tab} connection synced`,
      status: 'ready',
      revision: 0,
      token: session.token,
      executionId: null,
    };
    addSession(sessionRecord);
    setActiveSession(sessionRecord);

    // Run the onboarding transition immediately so it is not skipped by a
    // re-render between zustand updates and refreshUsage (global agent:connected
    // can populate the store before this async call resolves).
    if (onConnected) {
      onConnected();
    } else {
      onClose();
    }

    await refreshUsage(session.id).catch(() => null);
    await refreshAppState().catch(() => null);
  }, [addAgent, addSession, connections, onClose, onConnected, refreshAppState, refreshUsage, setActiveSession]);

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
    navigate('/#pricing');
    if (typeof window !== 'undefined') {
      window.location.hash = '#pricing';
    }
  }, [navigate, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!connections[activeTab] && !loadingTabs[activeTab] && !fetchAttemptedRef.current.has(activeTab)) {
      fetchAttemptedRef.current.add(activeTab);
      fetchConnection(activeTab);
    }
  }, [activeTab, connections, fetchConnection, isOpen, loadingTabs]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab(initialTab && TABS.includes(initialTab) ? initialTab : 'Prompt');
      setConnections({});
      setSyncState('idle');
      setErrors({});
      setLimitMessages({});
      setLoadingTabs({});
      fetchAttemptedRef.current = new Set();
      finalizedConnectionKeysRef.current = new Set();
      return undefined;
    }

    const session = connections[activeTab]?.connection?.session;
    if (!session?.id || !backendUrl) {
      setSyncState('idle');
      return undefined;
    }

    setSyncState('waiting');
    const socket = io(`${backendUrl}/session`, {
      ...SOCKET_OPTIONS,
      query: { sessionId: session.id },
    });

    socket.on('agent:connected', (eventData) => {
      if (!eventData || eventData.sessionId !== session.id) {
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
  }, [activeTab, backendUrl, connections, finalizeConnection, initialTab, isOpen]);

  /** HTTP fallback: if agent:connected is missed (WS timing, proxies), poll session after an 8s grace window. */
  useEffect(() => {
    if (!isOpen || syncState !== 'waiting') {
      return undefined;
    }

    const sess = connections[activeTab]?.connection?.session;
    const token = sess?.token;
    if (!sess?.id || !token || !backendUrl) {
      return undefined;
    }

    let cancelled = false;
    let intervalId = null;
    const baseUrl = backendUrl.replace(/\/+$/, '');
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
  }, [activeTab, backendUrl, connections, finalizeConnection, initialTab, isOpen, syncState]);

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
            <div className="cam-header">
              <div>
                <h2 className="cam-title">Connect Your Agent</h2>
                <p className="cam-subtitle">Choose how this agent connects to Syniq.</p>
              </div>
              <button className="cam-close" onClick={onClose}><X size={18} /></button>
            </div>

            <div className="cam-tabs">
              {TABS.map(tab => (
                <button
                  key={tab}
                  className={`cam-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

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
                  isAuthenticated={isAuthenticated}
                  onSignUp={handleSignUp}
                  onSignIn={handleSignIn}
                  onClose={onClose}
                  onViewPricing={handleViewPricing}
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
