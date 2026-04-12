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
    addNotification,
    approvalQueue,
    bootstrapWorkspace,
    connectModalOpen,
    connectedAgents,
    nodes,
    setConnectModalOpen,
  } = useStore();
  const [activeTab, setActiveTab] = useState('prompt');
  const [copiedTab, setCopiedTab] = useState('');

  useEffect(() => {
    bootstrapWorkspace();
  }, [bootstrapWorkspace]);

  const currentNode = useMemo(
    () => nodes.find((node) => node.state === 'approval') || nodes.find((node) => node.state === 'active'),
    [nodes]
  );

  const modalContent = {
    prompt: CONNECT_PROMPT,
    link: CONNECT_LINK,
    sdk: CONNECT_SDK_SNIPPET,
    live: CONNECT_LIVE_SNIPPET,
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

  const handleConnectAgent = () => {
    addAgent({
      id: `agent-${Date.now()}`,
      name: `${CONNECT_METHOD_TABS.find((tab) => tab.id === activeTab)?.label} Agent`,
      type: activeTab,
      status: 'connected',
      lastSeen: 'Live now',
    });
    addNotification({
      type: 'success',
      title: 'Agent attached',
      message: `${CONNECT_METHOD_TABS.find((tab) => tab.id === activeTab)?.label} Agent is now live in this session.`,
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
                  Attach Demo Agent
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
