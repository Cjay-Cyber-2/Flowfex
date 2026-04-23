import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import { CONNECT_LINK, CONNECT_LIVE_SNIPPET, CONNECT_PROMPT, CONNECT_SDK_SNIPPET } from '../store/demoData';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import { normalizeSessionConnectUrl, rewriteConnectPrompt } from '../utils/runtimeConfig';
import '../styles/landing-sections3.css';

const TABS = ['Prompt', 'Link', 'SDK', 'Live Channel'];
const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 10000,
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
        <p>Hidden until copied. Paste it into the target agent to preserve the Flowfex routing contract.</p>
        <CopyBtn text={text} />
      </div>
    </div>
  );
}

function PromptTab({ connection, loading, onRefresh, error }) {
  const sessionUrl = normalizeSessionConnectUrl(connection?.connection?.instructions?.sessionUrl || CONNECT_LINK);
  const promptText = rewriteConnectPrompt(connection?.connection?.instructions?.prompt || CONNECT_PROMPT, sessionUrl);
  return (
    <div>
      <p className="cam-tab-desc">Copy this prompt into the target agent. The prompt keeps the agent attached to Flowfex and forces Flowfex-first routing for the full conversation.</p>
      <ConcealedPayload text={promptText} title="Prompt contract hidden until copied" />
      <p className="cam-security-note">Session URL: {sessionUrl}</p>
      <button className="cam-text-link" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating...' : 'Refresh Session'}
      </button>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
    </div>
  );
}

function LinkTab({ connection, loading, onRefresh, error }) {
  const [copied, copy] = useCopy();
  const url = normalizeSessionConnectUrl(connection?.connection?.link?.url || CONNECT_LINK);
  const summary = connection?.connection?.instructions?.summary || 'This link resolves into the same Flowfex-first operating contract in the background.';
  return (
    <div>
      <p className="cam-tab-desc">Share this link when you want a fast attach flow without editing code. Once the agent resolves it, the same Flowfex-first rules apply for the rest of the conversation.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input readOnly value={url} className="cam-readonly-input" />
        <button className="cam-copy-btn" onClick={() => copy(url)}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <button className="cam-text-link" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating Link...' : 'Regenerate Link'}
      </button>
      <p className="cam-security-note">{summary}</p>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
    </div>
  );
}

function SDKTab({ connection, loading, onRefresh, error }) {
  const snippet = connection?.connection?.instructions?.sdkSnippet || CONNECT_SDK_SNIPPET;
  return (
    <div>
      <p className="cam-tab-desc">Use the SDK when the agent can stay attached programmatically. The snippet is hidden until copied so the operating contract is preserved cleanly.</p>
      <ConcealedPayload text={snippet} title="SDK attach payload hidden until copied" />
      <button className="cam-text-link" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating SDK Session...' : 'Refresh Session'}
      </button>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
      <p className="cam-security-note">Use the SDK when you want the cleanest app-side integration with Flowfex session control.</p>
    </div>
  );
}

function LiveChannelTab({ connection, loading, onRefresh, error }) {
  const [copied, copy] = useCopy();
  const endpoint = connection?.connection?.instructions?.endpointPayload || CONNECT_LIVE_SNIPPET;
  return (
    <div>
      <p className="cam-tab-desc">Use the live channel when the agent already supports persistent streaming. The transport stays attached to the same Flowfex routing contract for the full session.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input readOnly value={endpoint} className="cam-readonly-input" />
        <button className="cam-copy-btn" onClick={() => copy(endpoint)}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
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

function ConnectAgentModal({ isOpen, onClose, onConnected }) {
  const addAgent = useStore((state) => state.addAgent);
  const addSession = useStore((state) => state.addSession);
  const setActiveSession = useStore((state) => state.setActiveSession);
  const activeSession = useStore((state) => state.activeSession);
  const backendUrl = useStore((state) => state.backendUrl);
  const { accessToken } = useSessionContext();
  const [activeTab, setActiveTab] = useState('Prompt');
  const [connections, setConnections] = useState({});
  const [errors, setErrors] = useState({});
  const [loadingTab, setLoadingTab] = useState(null);
  const [syncState, setSyncState] = useState('idle');
  const fetchAttemptedRef = useRef(new Set());
  const finalizedSessionIdsRef = useRef(new Set());
  const TabContent = TAB_CONTENT[activeTab];

  const requestForTab = useCallback((tab) => {
    switch (tab) {
      case 'Prompt':
        return {
          sessionId: activeSession?.id,
          mode: 'prompt',
          prompt: 'Attach this agent to Flowfex for the full conversation and route every request through Flowfex before acting.',
          agent: { name: 'Prompt Agent', type: 'prompt' },
        };
      case 'Link':
        return {
          sessionId: activeSession?.id,
          mode: 'link',
          singleUse: true,
          agent: { name: 'Link Agent', type: 'link' },
        };
      case 'SDK':
        return {
          sessionId: activeSession?.id,
          mode: 'sdk',
          agent: { name: 'SDK Agent', type: 'sdk' },
        };
      case 'Live Channel':
        return {
          sessionId: activeSession?.id,
          mode: 'live',
          protocol: 'socket.io',
          agent: { name: 'Live Channel Agent', type: 'live' },
        };
      default:
        return null;
    }
  }, [activeSession?.id]);

  const fetchConnection = useCallback(async (tab) => {
    const request = requestForTab(tab);
    if (!request) {
      return;
    }

    setLoadingTab(tab);
    setErrors((current) => ({ ...current, [tab]: null }));

    try {
      const response = await fetch(`${backendUrl}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(request),
      });
      const { hasBody, payload } = await readConnectResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Connection bootstrap failed');
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
      setErrors((current) => ({
        ...current,
        [tab]: error instanceof Error ? error.message : 'Connection bootstrap failed',
      }));
    } finally {
      setLoadingTab(null);
    }
  }, [accessToken, backendUrl, requestForTab]);

  const finalizeConnection = useCallback((tab, eventData = null) => {
    const connection = connections[tab];
    const session = connection?.connection?.session;
    if (!session || finalizedSessionIdsRef.current.has(session.id)) {
      return;
    }

    finalizedSessionIdsRef.current.add(session.id);

    addAgent({
      id: eventData?.agentId || session.agent?.id || `agent-${session.id}`,
      name: eventData?.agentName || session.agent?.name || `${tab} Agent`,
      type: eventData?.connectionType || tab,
      status: 'connected',
      lastSeen: 'Live now',
    });
    const sessionRecord = {
      id: session.id,
      name: `${tab} Session`,
      task: 'Connected through Flowfex',
      heartbeat: `${tab} connection synced`,
      status: 'ready',
      revision: 0,
      token: session.token,
      executionId: null,
    };
    addSession(sessionRecord);
    setActiveSession(sessionRecord);

    if (onConnected) {
      onConnected();
      return;
    }

    onClose();
  }, [addAgent, addSession, connections, onClose, onConnected, setActiveSession]);

  useEffect(() => {
    if (!isOpen || connections[activeTab] || loadingTab === activeTab || fetchAttemptedRef.current.has(activeTab)) {
      return;
    }

    fetchAttemptedRef.current.add(activeTab);
    fetchConnection(activeTab);
  }, [activeTab, connections, fetchConnection, isOpen, loadingTab]);

  useEffect(() => {
    if (!isOpen) {
      setSyncState('idle');
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
      if (eventData?.sessionId !== session.id) {
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
  }, [activeTab, backendUrl, connections, finalizeConnection, isOpen]);

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
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
            <div className="cam-header">
              <div>
                <h2 className="cam-title">Connect Your Agent</h2>
                <p className="cam-subtitle">Choose how this agent connects to Flowfex.</p>
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
                  loading={loadingTab === activeTab}
                  onRefresh={() => fetchConnection(activeTab)}
                  error={errors[activeTab]}
                />
              </motion.div>
            </AnimatePresence>

            <div className="cam-footer">
              <div className="cam-sync-status">
                <span className={`cam-sync-dot cam-sync-dot-${syncState === 'connected' ? 'live' : 'waiting'}`} />
                <span>
                  {syncState === 'connected'
                    ? 'Agent synced with Flowfex. Opening the session.'
                    : 'Waiting for a real agent attach. Flowfex will only continue after actual sync.'}
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
