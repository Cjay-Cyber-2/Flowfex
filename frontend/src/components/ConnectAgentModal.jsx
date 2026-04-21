import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, CheckCheck, RefreshCw } from 'lucide-react';
import { CONNECT_LINK, CONNECT_LIVE_SNIPPET, CONNECT_PROMPT, CONNECT_SDK_SNIPPET } from '../store/demoData';
import useStore from '../store/useStore';
import '../styles/landing-sections3.css';

const TABS = ['Prompt', 'Link', 'SDK', 'Live Channel'];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return [copied, copy];
}

function CopyBtn({ text, style }) {
  const [copied, copy] = useCopy();
  return (
    <button className="cam-copy-btn" style={style} onClick={() => copy(text)}>
      {copied ? <><CheckCheck size={14} style={{ marginRight: 5 }} />Copied</> : <><Copy size={14} style={{ marginRight: 5 }} />Copy</>}
    </button>
  );
}

function PromptTab({ connection, loading, onRefresh, error }) {
  const [open, setOpen] = useState(false);
  const promptText = connection?.connection?.instructions?.prompt || CONNECT_PROMPT;
  const sessionUrl = connection?.connection?.instructions?.sessionUrl || CONNECT_LINK;
  return (
    <div>
      <p className="cam-tab-desc">Paste this into the target agent so it connects to this Flowfex session and asks Flowfex for resources before acting.</p>
      <div className="cam-code-block" style={{ position: 'relative' }}>
        <pre>{promptText}</pre>
        <CopyBtn text={promptText} style={{ position: 'absolute', bottom: 12, right: 12 }} />
      </div>
      <p className="cam-security-note">Session URL: {sessionUrl}</p>
      <button className="cam-text-link" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating...' : 'Refresh Session'}
      </button>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
      <button className="cam-expand-row" onClick={() => setOpen(!open)}>
        <span>{open ? '▾' : '▸'} Why this works</span>
      </button>
      <div className="cam-expand-body" style={{ maxHeight: open ? 200 : 0 }}>
        <p>The prompt names the session, tells the agent to pull resources through Flowfex first, and defines the step format Flowfex uses to map the run back onto the live canvas.</p>
      </div>
    </div>
  );
}

function LinkTab({ connection, loading, onRefresh, error }) {
  const [copied, copy] = useCopy();
  const url = connection?.connection?.link?.url || CONNECT_LINK;
  return (
    <div>
      <p className="cam-tab-desc">Share this link when you want a fast attach flow without editing code.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input readOnly value={url} className="cam-readonly-input" />
        <button className="cam-copy-btn" onClick={() => copy(url)}>
          {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <button className="cam-text-link" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={onRefresh} disabled={loading}>
        <RefreshCw size={13} /> {loading ? 'Generating Link...' : 'Regenerate Link'}
      </button>
      <p className="cam-security-note">🔒 This link expires in 24 hours and is single-use.</p>
      {error ? <p className="cam-security-note">Backend error: {error}</p> : null}
    </div>
  );
}

function SDKTab({ connection, loading, onRefresh, error }) {
  const session = connection?.connection?.session;
  const transport = connection?.connection?.transport;
  const snippet = session && transport
    ? `import { io } from 'socket.io-client';

const session = {
  id: '${session.id}',
  token: '${session.token || ''}',
};

const orchestration = io('${transport.orchestrationNamespace}', {
  query: { sessionId: session.id },
  transports: ['websocket'],
});

const response = await fetch('${session.endpoints.execute}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${session.token}\`,
  },
  body: JSON.stringify({
    input: 'Run through the live Flowfex session',
  }),
});

const result = await response.json();`
    : CONNECT_SDK_SNIPPET;
  return (
    <div>
      <div className="cam-code-block" style={{ position: 'relative' }}>
        <pre>{snippet}</pre>
        <CopyBtn text={snippet} style={{ position: 'absolute', bottom: 12, right: 12 }} />
      </div>
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
  const transport = connection?.connection?.transport;
  const live = connection?.connection?.live;
  const endpoint = transport && live
    ? `${transport.orchestrationNamespace}
channel: ${live.protocol}
sse: ${transport.sseUrl}
control: ${transport.controlNamespace}`
    : CONNECT_LIVE_SNIPPET;
  return (
    <div>
      <p className="cam-tab-desc">Use the live channel when the agent already supports persistent streaming.</p>
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
  const [activeTab, setActiveTab] = useState('Prompt');
  const [connections, setConnections] = useState({});
  const [errors, setErrors] = useState({});
  const [loadingTab, setLoadingTab] = useState(null);
  const fetchAttemptedRef = React.useRef(new Set());
  const TabContent = TAB_CONTENT[activeTab];

  const requestForTab = (tab) => {
    switch (tab) {
      case 'Prompt':
        return {
          mode: 'prompt',
          prompt: 'Connect this agent to Flowfex and ask Flowfex for resources before acting.',
          agent: { name: 'Prompt Agent', type: 'prompt' },
        };
      case 'Link':
        return {
          mode: 'link',
          singleUse: true,
          agent: { name: 'Link Agent', type: 'link' },
        };
      case 'SDK':
        return {
          mode: 'sdk',
          agent: { name: 'SDK Agent', type: 'sdk' },
        };
      case 'Live Channel':
        return {
          mode: 'live',
          protocol: 'socket.io',
          agent: { name: 'Live Channel Agent', type: 'live' },
        };
      default:
        return null;
    }
  };

  const fetchConnection = async (tab) => {
    const request = requestForTab(tab);
    if (!request) {
      return;
    }

    setLoadingTab(tab);
    setErrors((current) => ({ ...current, [tab]: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Connection bootstrap failed');
      }

      setConnections((current) => ({
        ...current,
        [tab]: payload,
      }));

      // Auto-detect: if we got a live session with a token, the connection is established
      const session = payload?.connection?.session;
      if (session?.id && session?.token) {
        // Register in store automatically
        const agentLabel = tab;
        addAgent({
          id: session.agent?.id || `agent-${session.id}`,
          name: session.agent?.name || `${agentLabel} Agent`,
          type: tab,
          status: 'connected',
          lastSeen: 'Live now',
        });
        const sessionRecord = {
          id: session.id,
          name: `${agentLabel} Session`,
          task: 'Connected through Flowfex',
          heartbeat: `${agentLabel} connection ready`,
          status: 'ready',
          revision: 0,
          token: session.token,
          executionId: null,
        };
        addSession(sessionRecord);
        setActiveSession(sessionRecord);

        // Auto-fire connected callback after short delay for UX
        if (onConnected) {
          setTimeout(() => onConnected(), 600);
        }
      }
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [tab]: error instanceof Error ? error.message : 'Connection bootstrap failed',
      }));
    } finally {
      setLoadingTab(null);
    }
  };

  useEffect(() => {
    if (!isOpen || connections[activeTab] || loadingTab === activeTab || fetchAttemptedRef.current.has(activeTab)) {
      return;
    }

    fetchAttemptedRef.current.add(activeTab);
    fetchConnection(activeTab);
  }, [activeTab, connections, isOpen, loadingTab]);

  const handleConnected = () => {
    const connection = connections[activeTab];
    const session = connection?.connection?.session;
    if (session) {
      addAgent({
        id: session.agent?.id || `agent-${session.id}`,
        name: session.agent?.name || `${activeTab} Agent`,
        type: activeTab,
        status: 'connected',
        lastSeen: 'Live now',
      });
      const sessionRecord = {
        id: session.id,
        name: `${activeTab} Session`,
        task: 'Connected through Flowfex',
        heartbeat: `${activeTab} connection ready`,
        status: 'ready',
        revision: 0,
        token: session.token,
        executionId: null,
      };
      addSession(sessionRecord);
      setActiveSession(sessionRecord);
    }

    if (onConnected) {
      onConnected();
      return;
    }

    onClose();
  };

  return (
    <AnimatePresence>
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

            <AnimatePresence mode="wait">
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
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--color-bistre)' }}>
                Prompt attach is the fastest way to test a session. Move to SDK or live channel when you want a tighter integration.
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="cam-done-btn" onClick={onClose}>Done</button>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConnectAgentModal;
