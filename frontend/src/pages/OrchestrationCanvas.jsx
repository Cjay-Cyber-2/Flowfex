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
      return 'You used all 10 free Syniq skill or tool requests for today.';
    }
    return 'You used all of today’s free Syniq skill or tool requests on this account.';
  }
  if (key === 'maxConnectionsPerDay') {
    return 'You hit today\u2019s Syniq attach cap.';
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
  return 'Syniq limits are blocking new work.';
}

function FreeTierPlanCard({ requestsLeft, requestLimit, onUpgrade, onDismiss }) {
  return (
    <div style={{
      marginBottom: 16,
      padding: '18px 20px',
      borderRadius: 20,
      border: '1px solid rgba(0, 212, 170, 0.18)',
      background:
        'linear-gradient(180deg, rgba(9, 24, 21, 0.92), rgba(8, 12, 16, 0.88))',
      boxShadow: '0 24px 54px rgba(0, 0, 0, 0.24)',
      display: 'grid',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ display: 'block', marginBottom: 6, color: 'var(--color-velin)', fontSize: 18 }}>
            Free account active
          </strong>
          <span style={{ color: 'rgba(232, 237, 242, 0.8)', fontSize: 14, lineHeight: 1.6 }}>
            You are now signed in. This account keeps your workspace, supports one connected agent, and includes {requestLimit} Syniq requests per day. Upgrade later for uninterrupted usage after the free quota is exhausted.
          </span>
        </div>
        <button className="btn btn-ghost" onClick={onDismiss}>Dismiss</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-bistre)', fontSize: 14 }}>
          Requests remaining today: <strong style={{ color: 'var(--color-velin)' }}>{Math.max(0, requestsLeft)}</strong>
        </span>
        <button className="btn btn-primary" onClick={onUpgrade}>View plans</button>
      </div>
    </div>
  );
}

function OrchestrationCanvas() {
  const navigate = useNavigate();
  const { isAuthenticated, sessionReady, usage, appState } = useSessionContext();
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
  const [freeTierCardDismissed, setFreeTierCardDismissed] = useState(false);

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
  const requestsLeft = requestLimit ? requestLimit - requestsToday : 0;
  const blockedLimit = usage?.blockedLimit || null;
  const connectionBlockedLimit = usage?.connectionBlockedLimit || null;
  const anyBlockReason = blockedLimit?.reason || connectionBlockedLimit?.reason || null;
  const gateHeadline = paymentGateHeadline(blockedLimit, connectionBlockedLimit, isAuthenticated);
  // Anonymous: full-screen pricing + sign up after free tier is exhausted.
  // Authenticated: same pricing wall until pay or daily reset; dismiss shows inline banner.
  const showAnonymousGate = !isAuthenticated && Boolean(anyBlockReason);
  const showPaymentGate = isAuthenticated && Boolean(anyBlockReason) && !paymentGateDismissed;
  const showAuthenticatedBanner = isAuthenticated && Boolean(anyBlockReason) && paymentGateDismissed;
  const showFreeTierCard = isAuthenticated
    && appState?.identity?.billing === 'free'
    && !freeTierCardDismissed
    && !showPaymentGate;

  useEffect(() => {
    setPaymentGateDismissed(false);
  }, [
    blockedLimit?.currentValue,
    blockedLimit?.limit,
    connectionBlockedLimit?.currentValue,
    connectionBlockedLimit?.limit,
    activeSession?.id,
  ]);

  useEffect(() => {
    setFreeTierCardDismissed(false);
  }, [activeSession?.id, appState?.identity?.billing]);

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

          {showFreeTierCard ? (
            <FreeTierPlanCard
              requestsLeft={requestsLeft}
              requestLimit={requestLimit || 10}
              onDismiss={() => setFreeTierCardDismissed(true)}
              onUpgrade={() => window.location.assign('/#pricing')}
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
