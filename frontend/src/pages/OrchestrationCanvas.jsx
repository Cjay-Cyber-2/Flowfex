import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Radio, Zap } from 'lucide-react';
import CanvasRenderer from '../components/canvas/CanvasRenderer';
import LeftRail from '../components/layout/LeftRail';
import RightDrawer from '../components/layout/RightDrawer';
import TopBar from '../components/layout/TopBar';
import useStore from '../store/useStore';
import {
  CONNECT_LINK,
  CONNECT_LIVE_SNIPPET,
  CONNECT_METHOD_TABS,
  CONNECT_PROMPT,
  CONNECT_SDK_SNIPPET,
} from '../store/demoData';
import '../styles/canvas.css';

function OrchestrationCanvas() {
  const {
    activeSession,
    addAgent,
    addSession,
    addNotification,
    approvalQueue,
    backendUrl,
    bootstrapWorkspace,
    connectModalOpen,
    connectedAgents,
    nodes,
    setActiveSession,
    setConnectModalOpen,
  } = useStore();
  const [activeTab, setActiveTab] = useState('prompt');
  const [copiedTab, setCopiedTab] = useState('');
  const [connectionPayloads, setConnectionPayloads] = useState({});
  const [loadingConnectionTab, setLoadingConnectionTab] = useState('');
  const [connectionErrors, setConnectionErrors] = useState({});

  useEffect(() => {
    bootstrapWorkspace();
  }, [bootstrapWorkspace]);

  const currentNode = useMemo(
    () => nodes.find((node) => node.state === 'approval') || nodes.find((node) => node.state === 'active'),
    [nodes]
  );

  const modalContent = {
    prompt: connectionPayloads.prompt?.connection?.instructions?.prompt || CONNECT_PROMPT,
    link: connectionPayloads.link?.connection?.link?.url || CONNECT_LINK,
    sdk: connectionPayloads.sdk?.connection?.session
      ? `const response = await fetch('${connectionPayloads.sdk.connection.session.endpoints.execute}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ${connectionPayloads.sdk.connection.session.token || ''}',
  },
  body: JSON.stringify({ input: 'Run through the live Flowfex session' }),
});`
      : CONNECT_SDK_SNIPPET,
    live: connectionPayloads.live?.connection?.transport
      ? `${connectionPayloads.live.connection.transport.orchestrationNamespace}
channel: ${connectionPayloads.live.connection.live?.protocol || 'socket.io'}
sse: ${connectionPayloads.live.connection.transport.sseUrl}
control: ${connectionPayloads.live.connection.transport.controlNamespace}`
      : CONNECT_LIVE_SNIPPET,
  };

  const modalMeta = {
    prompt: {
      title: 'Prompt attach',
      description: 'Paste this into the target agent so it connects to this Flowfex session and asks Flowfex for resources before acting.',
    },
    link: {
      title: 'Session link',
      description: 'Share a live session URL when you want a quick attach flow without changing code.',
    },
    sdk: {
      title: 'SDK bridge',
      description: 'Drop in a lightweight client, connect once, and let Flowfex manage the session bridge.',
    },
    live: {
      title: 'Live channel',
      description: 'Use the persistent streaming endpoint for agents that already support socket or channel-based transport.',
    },
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(modalContent[activeTab]);
      setCopiedTab(activeTab);
      addNotification({
        type: 'success',
        title: 'Copied',
        message: `${modalMeta[activeTab].title} copied to your clipboard.`,
      });
      window.setTimeout(() => setCopiedTab(''), 1500);
    } catch (error) {
      addNotification({
        type: 'warning',
        title: 'Copy unavailable',
        message: 'Clipboard access is blocked in this environment. You can still copy the text manually.',
      });
    }
  };

  const buildRequestForTab = (tab) => {
    switch (tab) {
      case 'prompt':
        return {
          mode: 'prompt',
          prompt: 'Connect this agent to Flowfex and ask Flowfex for resources before acting.',
          agent: { name: 'Prompt Agent', type: 'prompt' },
        };
      case 'link':
        return {
          mode: 'link',
          singleUse: true,
          agent: { name: 'Link Agent', type: 'link' },
        };
      case 'sdk':
        return {
          mode: 'sdk',
          agent: { name: 'SDK Agent', type: 'sdk' },
        };
      case 'live':
        return {
          mode: 'live',
          protocol: 'socket.io',
          agent: { name: 'Live Channel Agent', type: 'live' },
        };
      default:
        return null;
    }
  };

  const fetchConnectionPayload = async (tab) => {
    const request = buildRequestForTab(tab);
    if (!request) return;

    setLoadingConnectionTab(tab);
    setConnectionErrors((current) => ({ ...current, [tab]: null }));

    try {
      const response = await fetch(`${backendUrl}/connect`, {
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

      setConnectionPayloads((current) => ({
        ...current,
        [tab]: payload,
      }));
    } catch (error) {
      setConnectionErrors((current) => ({
        ...current,
        [tab]: error instanceof Error ? error.message : 'Connection bootstrap failed',
      }));
    } finally {
      setLoadingConnectionTab('');
    }
  };

  useEffect(() => {
    if (!connectModalOpen || connectionPayloads[activeTab] || loadingConnectionTab === activeTab) {
      return;
    }

    fetchConnectionPayload(activeTab);
  }, [activeTab, connectModalOpen, connectionPayloads, loadingConnectionTab]);

  const handleConnectAgent = () => {
    const payload = connectionPayloads[activeTab];
    const session = payload?.connection?.session;
    if (!session) {
      addNotification({
        type: 'warning',
        title: 'Connection not ready',
        message: 'Generate the connection payload before attaching the agent.',
      });
      return;
    }

    const agentLabel = CONNECT_METHOD_TABS.find((tab) => tab.id === activeTab)?.label || activeTab;
    addAgent({
      id: session.agent?.id || `agent-${session.id}`,
      name: session.agent?.name || `${agentLabel} Agent`,
      type: activeTab,
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
    addNotification({
      type: 'success',
      title: 'Agent attached',
      message: `${agentLabel} Agent is now live in this session.`,
    });
    setConnectModalOpen(false);
  };

  return (
    <div className="orchestration-canvas-page">
      <TopBar />

      <div className="canvas-layout">
        <LeftRail />

        <main className="canvas-main-shell">
          <div className="canvas-surface-header">
            <div className="canvas-surface-pill">
              <span className="canvas-surface-pill-label">Current path</span>
              <strong>{currentNode?.title || 'Waiting for agent'}</strong>
            </div>
            <div className="canvas-surface-pill">
              <span className="canvas-surface-pill-label">Approvals</span>
              <strong>{approvalQueue.length} pending</strong>
            </div>
            <div className="canvas-surface-pill">
              <span className="canvas-surface-pill-label">Connected agents</span>
              <strong>{connectedAgents.length}</strong>
            </div>
          </div>

          <div className="canvas-stage">
            <CanvasRenderer />
          </div>

          <div className="canvas-footer-strip">
            <span>{activeSession?.task || 'Live orchestration'}</span>
            <span>{activeSession?.heartbeat || 'Ready'}</span>
          </div>
        </main>

        <RightDrawer />
      </div>

      {connectModalOpen ? (
        <div className="modal-overlay" onClick={() => setConnectModalOpen(false)}>
          <div className="flowfex-connect-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flowfex-connect-modal-header">
              <div>
                <span className="drawer-kicker">Connect agent</span>
                <h2>Connect Your Agent</h2>
                <p>Attach an IDE, CLI, prompt-based agent, or live bridge in seconds.</p>
              </div>
              <button className="flowfex-connect-close" onClick={() => setConnectModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="flowfex-connect-tabs">
              {CONNECT_METHOD_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`flowfex-connect-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flowfex-connect-body">
              <div className="flowfex-connect-copy">
                <div className="flowfex-connect-copy-header">
                  <div>
                    <strong>{modalMeta[activeTab].title}</strong>
                    <p>{modalMeta[activeTab].description}</p>
                    {connectionErrors[activeTab] ? <p>{connectionErrors[activeTab]}</p> : null}
                  </div>
                  <button className="btn btn-ghost" onClick={handleCopy}>
                    <Copy size={16} />
                    {copiedTab === activeTab ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <pre>{modalContent[activeTab]}</pre>
              </div>

              <div className="flowfex-connect-side">
                <div className="flowfex-connect-hint">
                  <div className="flowfex-connect-hint-icon">
                    {activeTab === 'prompt' ? <Copy size={18} /> : null}
                    {activeTab === 'link' ? <Link2 size={18} /> : null}
                    {activeTab === 'sdk' ? <Zap size={18} /> : null}
                    {activeTab === 'live' ? <Radio size={18} /> : null}
                  </div>
                  <h3>Bridge the agent into Flowfex</h3>
                  <p>
                    The connection opens a live session, routes resource pulls through Flowfex, and keeps the operator view in sync.
                  </p>
                </div>

                <div className="flowfex-connect-status-card">
                  <span className="drawer-kicker">Connection status</span>
                  <div className="flowfex-connect-status-line">
                    <span className="flowfex-connect-status-dot" />
                    <strong>{connectedAgents.length ? 'Agent connected' : 'Ready for connection'}</strong>
                  </div>
                  <p>{connectedAgents[0]?.name || activeSession?.name || 'Launch Intelligence Pulse'}</p>
                </div>

                <button className="btn btn-primary flowfex-connect-primary" onClick={handleConnectAgent}>
                  {loadingConnectionTab === activeTab ? 'Preparing…' : 'Attach Agent'}
                </button>
              </div>
            </div>

            <div className="flowfex-connect-footer">
              <p>
                Need help connecting? <span>View connection guide →</span>
              </p>
              <button className="btn btn-ghost" onClick={() => setConnectModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default OrchestrationCanvas;
