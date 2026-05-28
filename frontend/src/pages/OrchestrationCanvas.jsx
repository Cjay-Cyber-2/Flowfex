import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import { resolveProductIdentityState, shouldShowPricingWall } from '../identity/resolveProductIdentityState';
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
      return 'You used all 15 free Syniq tools requests for this window.';
    }
    if (blockedLimit?.limitValue === 0) {
      return 'Your Syniq account needs Pro to run new tool and skill requests.';
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

function OrchestrationCanvas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, sessionReady, usage, appState, refreshUsage } = useSessionContext();
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
  const [pricingWallDismissed, setPricingWallDismissed] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;
    bootstrapWorkspace();
  }, [bootstrapWorkspace, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !activeSession?.id) return;
    hydrateSessionState(activeSession.id);
  }, [activeSession?.id, hydrateSessionState, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !activeSession?.id) return undefined;
    refreshUsage(activeSession.id).catch(() => {});
    const intervalId = window.setInterval(() => {
      refreshUsage(activeSession.id).catch(() => {});
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [activeSession?.id, refreshUsage, sessionReady]);

  const liveConnectedAgents = useMemo(
    () => filterLiveConnectedAgents(connectedAgents),
    [connectedAgents],
  );

  const currentNode = useMemo(
    () => nodes.find((node) => node.state === 'approval') || nodes.find((node) => node.state === 'active'),
    [nodes],
  );

  const requestLimit = usage?.limits?.maxExecutionsPerSession
    ?? usage?.limits?.maxExecutionsPerDay
    ?? null;
  const requestsToday = usage?.usage?.executionsCount || 0;
  const blockedLimit = usage?.blockedLimit || null;
  const connectionBlockedLimit = usage?.connectionBlockedLimit || null;
  const anyBlockReason = blockedLimit?.reason || connectionBlockedLimit?.reason || null;
  const executionQuotaExhausted = isExecutionQuotaExhausted(usage);
  const gateHeadline = paymentGateHeadline(blockedLimit, connectionBlockedLimit, isAuthenticated);
  const cycleKey = quotaCycleKey(usage);
  const isPro = appState?.identity?.billing === 'pro';
  const freeTierHasNoRequests = isAuthenticated && !isPro && usage?.limits?.maxExecutionsPerDay === 0;
  const forcePricingFromAuth = Boolean(location.state?.showPricingWall)
    || searchParams.get('upgrade') === '1';

  const identityState = resolveProductIdentityState({
    sessionReady,
    isAuthenticated,
    appState,
    usage,
    hasConnectedAgent: liveConnectedAgents.length > 0,
  });

  const showAnonymousQuotaGate = !isAuthenticated && executionQuotaExhausted;
  const showAuthenticatedBanner = isAuthenticated
    && Boolean(anyBlockReason)
    && !isPro
    && !executionQuotaExhausted
    && !freeTierHasNoRequests;
  const showAuthenticatedPricingWall = isAuthenticated
    && !isPro
    && !pricingWallDismissed
    && (shouldShowPricingWall(identityState) || executionQuotaExhausted || forcePricingFromAuth);

  useEffect(() => {
    setPricingWallDismissed(false);
  }, [activeSession?.id, appState?.identity?.billing, cycleKey]);

  useEffect(() => {
    if (forcePricingFromAuth) setPricingWallDismissed(false);
  }, [forcePricingFromAuth]);

  const pricingHeadline = forcePricingFromAuth && location.state?.reason === 'anonymous_quota'
    ? 'Your workspace is saved — upgrade to keep orchestrating'
    : gateHeadline;

  const pricingMessage = blockedLimit?.reason || anyBlockReason || (freeTierHasNoRequests
    ? 'Signed-in Syniq accounts do not include free tool requests. Choose Pro to continue, or wait if your billing window is renewing.'
    : 'Upgrade for uninterrupted Syniq tools requests, or wait for your quota window to renew.');

  return (
    <div className="orchestration-canvas-page">
      <TopBar />
      <div className="canvas-layout">
        <LeftRail />
        <main className="canvas-main-shell">
          {showAnonymousQuotaGate ? (
            <UsageGateBanner
              isAuthenticated={false}
              title="You used all 15 free tools requests for this window"
              message={blockedLimit?.reason || 'Sign up to save your workspace, then upgrade to Pro to keep orchestrating — or wait about 5 hours for your guest quota to renew.'}
              onSignIn={() => navigate('/signin', { state: { from: location.pathname, reason: 'anonymous_quota' } })}
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
            {requestLimit !== null && requestLimit !== undefined ? (
              <div className="canvas-surface-pill">
                <span className="canvas-surface-pill-label">Tools request</span>
                <strong>
                  {freeTierHasNoRequests && !isPro
                    ? 'Upgrade required'
                    : `${requestsToday} / ${requestLimit}`}
                </strong>
              </div>
            ) : null}
          </div>

          <div className="canvas-stage">
            <CanvasRenderer />
          </div>

          <div className="canvas-footer-strip">
            <span>{activeSession?.heartbeat || 'Ready'}</span>
            <span>{liveConnectedAgents.length} agent{liveConnectedAgents.length === 1 ? '' : 's'} · {nodes.length} graph nodes</span>
          </div>
        </main>
        <RightDrawer />
      </div>

      <ConnectAgentModal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
      <DashboardTour sessionReady={sessionReady} />
      {showAuthenticatedPricingWall ? (
        <QuotaPricingOverlay
          variant="authenticated"
          headline={pricingHeadline}
          message={pricingMessage}
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
