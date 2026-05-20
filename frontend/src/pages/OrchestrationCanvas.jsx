import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CanvasRenderer from '../components/canvas/CanvasRenderer';
import LeftRail from '../components/layout/LeftRail';
import RightDrawer from '../components/layout/RightDrawer';
import TopBar from '../components/layout/TopBar';
import ConnectAgentModal from '../components/ConnectAgentModal';
import DashboardTour from '../components/dashboard/DashboardTour';
import QuotaPricingOverlay from '../components/billing/QuotaPricingOverlay';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
import { filterLiveConnectedAgents } from '../utils/agentPresence';
import {
  isExecutionQuotaExhausted,
  markPricingWallSeen,
  quotaCycleKey,
} from '../utils/quotaNavigation';
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
          <button type="button" className="btn btn-primary" onClick={onSignUp}>Sign Up</button>
          <button type="button" className="btn btn-ghost" onClick={onSignIn}>Sign In</button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/pricing')}>
          View plans
        </button>
      )}
    </div>
  );
}

function paymentGateHeadline(blockedLimit, connectionBlockedLimit, isAuthenticated) {
  const key = blockedLimit?.limit || connectionBlockedLimit?.limit;
  const tier = blockedLimit?.tier || connectionBlockedLimit?.tier;
  if (key === 'maxExecutionsPerSession' || key === 'maxExecutionsPerDay') {
    if (!isAuthenticated || tier === 'anonymous') {
      return 'You used all 6 free Syniq tools requests for this window.';
    }
    return 'You used all free Syniq tools requests for this account window.';
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
            You are signed in. This tier includes {requestLimit} Syniq requests per 5-hour window. Upgrade for
            uninterrupted pulls after the quota is exhausted.
          </span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onDismiss}>Dismiss</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-bistre)', fontSize: 14 }}>
          Requests remaining: <strong style={{ color: 'var(--color-velin)' }}>{Math.max(0, requestsLeft)}</strong>
        </span>
        <button type="button" className="btn btn-primary" onClick={onUpgrade}>View plans</button>
      </div>
    </div>
  );
}

function OrchestrationCanvas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, sessionReady, usage, appState } = useSessionContext();
  const {
    activeSession,
    approvalQueue,
    bootstrapWorkspace,
    connectModalOpen,
    connectedAgents,
    hydrateSessionState,
    nodes,
    setConnectModalOpen,
  } = useStore();
  const [freeTierCardDismissed, setFreeTierCardDismissed] = useState(false);
  const [pricingWallDismissed, setPricingWallDismissed] = useState(false);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    bootstrapWorkspace();
  }, [bootstrapWorkspace, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !activeSession?.id) {
      return;
    }

    hydrateSessionState(activeSession.id);
  }, [activeSession?.id, hydrateSessionState, sessionReady]);

  const liveConnectedAgents = useMemo(
    () => filterLiveConnectedAgents(connectedAgents),
    [connectedAgents]
  );

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
  const executionQuotaExhausted = isExecutionQuotaExhausted(usage);
  const gateHeadline = paymentGateHeadline(blockedLimit, connectionBlockedLimit, isAuthenticated);
  const cycleKey = quotaCycleKey(usage);
  const isPro = appState?.identity?.billing === 'pro';

  const showAnonymousQuotaGate = !isAuthenticated && executionQuotaExhausted;
  const showAuthenticatedBanner = isAuthenticated && Boolean(anyBlockReason) && !isPro && !executionQuotaExhausted;
  const showAuthenticatedPricingWall = isAuthenticated
    && executionQuotaExhausted
    && !isPro
    && !pricingWallDismissed;
  const showFreeTierCard = isAuthenticated
    && appState?.identity?.billing === 'free'
    && !freeTierCardDismissed
    && !executionQuotaExhausted;

  useEffect(() => {
    setFreeTierCardDismissed(false);
    setPricingWallDismissed(false);
  }, [activeSession?.id, appState?.identity?.billing, cycleKey]);

  return (
    <div className="orchestration-canvas-page">
      <TopBar />

      <div className="canvas-layout">
        <LeftRail />

        <main className="canvas-main-shell">
          {showAnonymousQuotaGate ? (
            <UsageGateBanner
              isAuthenticated={false}
              title="You used all 6 free tools requests for this window"
              message={blockedLimit?.reason || 'Create a free account to keep orchestrating, or wait for your quota to renew.'}
              onSignIn={() => navigate('/signin', { state: { from: location.pathname } })}
              onSignUp={() => navigate('/signup', { state: { from: location.pathname, reason: 'anonymous_quota' } })}
            />
          ) : null}

          {showAuthenticatedBanner ? (
            <UsageGateBanner
              isAuthenticated
              title={gateHeadline}
              message={anyBlockReason}
              onSignIn={() => navigate('/signin')}
              onSignUp={() => navigate('/signup')}
            />
          ) : null}

          {showFreeTierCard ? (
            <FreeTierPlanCard
              requestsLeft={requestsLeft}
              requestLimit={requestLimit || 6}
              onDismiss={() => setFreeTierCardDismissed(true)}
              onUpgrade={() => navigate('/pricing')}
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
              <strong>{liveConnectedAgents.length}</strong>
            </div>
            {requestLimit ? (
              <div className="canvas-surface-pill">
                <span className="canvas-surface-pill-label">Tools request</span>
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
      <DashboardTour sessionReady={sessionReady} />
      {showAuthenticatedPricingWall ? (
        <QuotaPricingOverlay
          variant="authenticated"
          headline={gateHeadline}
          message={blockedLimit?.reason || anyBlockReason || 'Upgrade for uninterrupted Syniq tools requests, or wait for your quota window to renew.'}
          resetAt={usage?.resetAt}
          onDismiss={() => {
            markPricingWallSeen(cycleKey);
            setPricingWallDismissed(true);
          }}
        />
      ) : null}
    </div>
  );
}

export default OrchestrationCanvas;
