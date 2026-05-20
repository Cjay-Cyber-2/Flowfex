import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext';
import { formatResetCountdown } from '../utils/formatQuotaReset';
import './PricingPage.css';

const ModernPricingSection = lazy(() => import('../components/landing/ModernPricingSection'));

export default function PricingPage() {
  const navigate = useNavigate();
  const { usage, hasConnectedAgent, isAuthenticated } = useSessionContext();

  const handleContinueFree = () => {
    if (hasConnectedAgent) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="pricing-page">
      <header className="pricing-page__header">
        <div className="pricing-page__intro">
          <p className="pricing-page__eyebrow">
            {isAuthenticated ? 'Free tier quota' : 'Upgrade Syniq'}
          </p>
          <h1 className="pricing-page__title">Choose how you want to keep orchestrating</h1>
          <p className="pricing-page__lede">
            Go Pro for uninterrupted skill and tool pulls, or stay on the free tier and wait for your
            quota window to renew.
          </p>
          <p className="pricing-page__reset">{formatResetCountdown(usage?.resetAt)}</p>
        </div>
        <div className="pricing-page__header-actions">
          <button type="button" className="btn btn-ghost" onClick={handleContinueFree}>
            {hasConnectedAgent ? 'Back to dashboard' : 'Connect an agent'}
          </button>
        </div>
      </header>

      <Suspense fallback={<div className="pricing-page__fallback">Loading plans…</div>}>
        <ModernPricingSection
          embedMode
          showBillingToggle
          embeddedCta={(planName) => {
            if (planName === 'Starter' || planName === 'Free') {
              handleContinueFree();
              return;
            }
            window.location.assign('/#pricing');
          }}
        />
      </Suspense>
    </div>
  );
}
