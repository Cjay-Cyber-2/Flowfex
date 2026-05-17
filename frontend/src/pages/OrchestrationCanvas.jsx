import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CanvasRenderer from '../components/canvas/CanvasRenderer';
import LeftRail from '../components/layout/LeftRail';
import RightDrawer from '../components/layout/RightDrawer';
import TopBar from '../components/layout/TopBar';
import ConnectAgentModal from '../components/ConnectAgentModal';
import QuotaPricingOverlay from '../components/billing/QuotaPricingOverlay';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import '../styles/canvas.css';

function UsageGateBanner({ isAuthenticated, title, message, onSignIn, onSignUp }) {
  const headline = title
    || (isAuthenticated ? 'Account limit reached' : 'Anonymous session limit reached');
  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 18px',
      borderRadius: 16,
      border: '1px solid rgba(0, 212, 170, 0.24)',
      background: 'rgba(8, 32, 28, 0.28)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 240 }}>
        <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-velin)' }}>
          {headline}
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

function paymentGateHeadline(blockedLimit, connectionBlockedLimit, isAuthenticated) {
  const key = blockedLimit?.limit || connectionBlockedLimit?.limit;
  const tier = blockedLimit?.tier || connectionBlockedLimit?.tier;
  if (key === 'maxExecutionsPerSession' || key === 'maxExecutionsPerDay') {
    if (!isAuthenticated || tier === 'anonymous') {
      return 'You used all 10 free Syn-IQ skill or tool requests for this session.';
    }
    return 'You used all of today’s free Syn-IQ skill or tool requests on this account.';
  }
  if (key === 'maxConnectionsPerDay') {
    return 'You hit today\u2019s Syn-IQ attach cap.';
  }
  if (key === 'maxSessionDurationMinutes') {
    return 'This session reached its allowed duration.';
  }
  if (key === 'maxNodesPerSession' || key === 'maxNodesPerDay') {
    return 'You reached the node processing limit for this tier.';
  }
  if (key === 'maxConcurrentAgents') {
    return 'Too many agents are connected for this tier.';
  }
  return 'Syn-IQ limits are blocking new work.';
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
  const requestLimit = usage?.limits?.maxExecutionsPerSession
    || usage?.limits?.maxExecutionsPerDay
    || null;
  const requestsToday = usage?.usage?.executionsCount || 0;
  const blockedLimit = usage?.blockedLimit || null;
  const connectionBlockedLimit = usage?.connectionBlockedLimit || null;
  const anyBlockReason = blockedLimit?.reason || connectionBlockedLimit?.reason || null;
  const gateHeadline = paymentGateHeadline(blockedLimit, connectionBlockedLimit, isAuthenticated);
  // Anonymous: full-screen pricing + sign up after free tier is exhausted.
  // Authenticated: same pricing wall until pay or daily reset; dismiss shows inline banner.
  const showAnonymousGate = !isAuthenticated && Boolean(anyBlockReason);
  const showPaymentGate = isAuthenticated && Boolean(anyBlockReason) && !paymentGateDismissed;
  const showAuthenticatedBanner = isAuthenticated && Boolean(anyBlockReason) && paymentGateDismissed;

  useEffect(() => {
    setPaymentGateDismissed(false);
  }, [
    blockedLimit?.currentValue,
    blockedLimit?.limit,
    connectionBlockedLimit?.currentValue,
    connectionBlockedLimit?.limit,
    activeSession?.id,
  ]);

  return (
    <div className="orchestration-canvas-page">
      <TopBar />

      <div className="canvas-layout">
        <LeftRail />

        <main className="canvas-main-shell">
          {showAuthenticatedBanner ? (
            <UsageGateBanner
              isAuthenticated
              title={gateHeadline}
              message={anyBlockReason}
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
            {requestLimit ? (
              <div className="canvas-surface-pill">
                <span className="canvas-surface-pill-label">Skill / tool pulls</span>
                <strong>{requestsToday} / {requestLimit}</strong>
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
      {showAnonymousGate ? (
        <QuotaPricingOverlay
          variant="anonymous"
          headline={gateHeadline}
          message={anyBlockReason}
          resetAt={usage?.resetAt}
          onSignIn={() => navigate('/signin')}
          onSignUp={() => navigate('/signup')}
        />
      ) : null}
      {showPaymentGate ? (
        <QuotaPricingOverlay
          variant="authenticated"
          headline={gateHeadline}
          message={anyBlockReason}
          resetAt={usage?.resetAt}
          onDismiss={() => setPaymentGateDismissed(true)}
        />
      ) : null}
    </div>
  );
}

export default OrchestrationCanvas;
