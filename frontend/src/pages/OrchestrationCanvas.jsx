import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CanvasRenderer from '../components/canvas/CanvasRenderer';
import LeftRail from '../components/layout/LeftRail';
import RightDrawer from '../components/layout/RightDrawer';
import TopBar from '../components/layout/TopBar';
import ConnectAgentModal from '../components/ConnectAgentModal';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import '../styles/canvas.css';

function formatResetLabel(resetAt) {
  if (!resetAt) {
    return 'the next daily reset';
  }

  try {
    return new Date(resetAt).toLocaleString();
  } catch {
    return 'the next daily reset';
  }
}

function UsageGateBanner({ isAuthenticated, message, onSignIn, onSignUp }) {
  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 18px',
      borderRadius: 16,
      border: '1px solid rgba(255, 164, 98, 0.24)',
      background: 'rgba(67, 38, 22, 0.28)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 240 }}>
        <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-velin)' }}>
          {isAuthenticated ? 'Free connection limit reached' : 'Anonymous token finished'}
        </strong>
        <span style={{ color: 'rgba(232, 237, 242, 0.76)', fontSize: 14 }}>{message}</span>
      </div>

      {!isAuthenticated ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onSignUp}>Sign Up</button>
          <button className="btn btn-ghost" onClick={onSignIn}>Sign In</button>
        </div>
      ) : null}
    </div>
  );
}

function PaymentGate({ resetAt, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 120,
      background: 'rgba(4, 8, 12, 0.7)',
      backdropFilter: 'blur(14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: 'min(560px, 100%)',
        borderRadius: 20,
        border: '1px solid rgba(0, 212, 170, 0.18)',
        background: 'linear-gradient(180deg, rgba(16, 24, 32, 0.96) 0%, rgba(10, 16, 22, 0.98) 100%)',
        boxShadow: '0 28px 90px rgba(0,0,0,0.45)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 28, borderBottom: '1px solid rgba(0, 212, 170, 0.08)' }}>
          <span style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(0, 212, 170, 0.12)', color: 'var(--color-sinoper)' }}>
            Payment Required
          </span>
          <h2 style={{ margin: '16px 0 8px', fontSize: 28, lineHeight: 1.1, color: 'var(--color-velin)' }}>You used all 5 free Flowfex connections for today.</h2>
          <p style={{ margin: 0, color: 'rgba(232, 237, 242, 0.72)', lineHeight: 1.6 }}>
            Continue with a paid plan when billing is enabled for this account, or wait until {formatResetLabel(resetAt)} for the next daily renewal.
          </p>
        </div>

        <div style={{ padding: 28, display: 'grid', gap: 18 }}>
          <div style={{
            borderRadius: 16,
            border: '1px solid rgba(196, 149, 48, 0.18)',
            background: 'rgba(196, 149, 48, 0.08)',
            padding: 18,
          }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-velin)' }}>Current access state</strong>
            <span style={{ color: 'rgba(232, 237, 242, 0.76)', lineHeight: 1.6 }}>
              Your authenticated dashboard is live, but new free connections are paused until billing is turned on or the daily quota resets.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={onClose}>Wait For Reset</button>
            <button className="btn btn-primary" onClick={() => window.location.assign('/#pricing')}>View Pricing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrchestrationCanvas() {
  const navigate = useNavigate();
  const { isAuthenticated, sessionReady, usage } = useSessionContext();
  const {
    activeSession,
    approvalQueue,
    bootstrapWorkspace,
    connectModalOpen,
    connectedAgents,
    nodes,
    setConnectModalOpen,
  } = useStore();
  const [paymentGateDismissed, setPaymentGateDismissed] = useState(false);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    bootstrapWorkspace();
  }, [bootstrapWorkspace, sessionReady]);

  const currentNode = useMemo(
    () => nodes.find((node) => node.state === 'approval') || nodes.find((node) => node.state === 'active'),
    [nodes]
  );
  const connectionLimit = usage?.limits?.maxConnectionsPerDay || null;
  const connectionsToday = usage?.usage?.connectionsCount || 0;
  const connectionBlockedLimit = usage?.connectionBlockedLimit || null;
  const showAnonymousGate = !isAuthenticated && connectionBlockedLimit?.limit === 'maxConnectionsPerDay';
  const showPaymentGate = isAuthenticated && connectionBlockedLimit?.limit === 'maxConnectionsPerDay' && !paymentGateDismissed;

  useEffect(() => {
    setPaymentGateDismissed(false);
  }, [connectionBlockedLimit?.currentValue, connectionBlockedLimit?.limit, activeSession?.id]);

  return (
    <div className="orchestration-canvas-page">
      <TopBar />

      <div className="canvas-layout">
        <LeftRail />

        <main className="canvas-main-shell">
          {showAnonymousGate ? (
            <UsageGateBanner
              isAuthenticated={false}
              message={connectionBlockedLimit.reason}
              onSignIn={() => navigate('/signin')}
              onSignUp={() => navigate('/signup')}
            />
          ) : null}

          {isAuthenticated && connectionBlockedLimit?.limit === 'maxConnectionsPerDay' ? (
            <UsageGateBanner
              isAuthenticated
              message={connectionBlockedLimit.reason}
              onSignIn={() => {}}
              onSignUp={() => {}}
            />
          ) : null}

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
            {connectionLimit ? (
              <div className="canvas-surface-pill">
                <span className="canvas-surface-pill-label">Connections today</span>
                <strong>{connectionsToday} / {connectionLimit}</strong>
              </div>
            ) : null}
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

      <ConnectAgentModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
      {showPaymentGate ? <PaymentGate resetAt={usage?.resetAt} onClose={() => setPaymentGateDismissed(true)} /> : null}
    </div>
  );
}

export default OrchestrationCanvas;
