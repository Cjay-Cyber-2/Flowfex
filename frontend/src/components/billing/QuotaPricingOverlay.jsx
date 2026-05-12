import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuotaPricingOverlay.css';

const ModernPricingSection = lazy(() => import('../landing/ModernPricingSection'));

function formatResetLine(resetAt) {
  if (!resetAt) {
    return 'Your free Flowfex requests renew on the next daily reset (UTC).';
  }
  try {
    return `Quota renews after ${new Date(resetAt).toLocaleString()}.`;
  } catch {
    return 'Your free Flowfex requests renew on the next daily reset.';
  }
}

/**
 * Full-screen upgrade / quota wall with the same pricing cards as the landing page.
 */
export default function QuotaPricingOverlay({
  variant,
  headline,
  message,
  resetAt,
  onDismiss = () => {},
  onSignIn = () => {},
  onSignUp = () => {},
}) {
  const navigate = useNavigate();
  const isAnon = variant === 'anonymous';

  return (
    <div className="quota-pricing-overlay" role="dialog" aria-modal="true" aria-labelledby="quota-pricing-title">
      <div className="quota-pricing-overlay__scroller">
        <div className="quota-pricing-overlay__intro">
          <p className="quota-pricing-overlay__eyebrow">{isAnon ? 'Guest session limit' : 'Account quota'}</p>
          <h2 id="quota-pricing-title" className="quota-pricing-overlay__title">
            {headline}
          </h2>
          <p className="quota-pricing-overlay__body">{message}</p>
          <p className="quota-pricing-overlay__reset">{formatResetLine(resetAt)}</p>

          {isAnon ? (
            <div className="quota-pricing-overlay__actions">
              <button type="button" className="btn btn-primary" onClick={onSignUp}>
                Create free account
              </button>
              <button type="button" className="btn btn-ghost" onClick={onSignIn}>
                Sign in
              </button>
              <button type="button" className="btn btn-ghost quota-pricing-overlay__ghost" onClick={() => navigate('/')}>
                Back to home
              </button>
            </div>
          ) : (
            <div className="quota-pricing-overlay__actions">
              <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/#pricing')}>
                View plans on marketing site
              </button>
              <button type="button" className="btn btn-ghost" onClick={onDismiss}>
                Wait for daily reset
              </button>
            </div>
          )}
        </div>

        <div className="quota-pricing-overlay__pricing-host">
          <Suspense fallback={<div className="quota-pricing-overlay__fallback">Loading plans…</div>}>
            <ModernPricingSection
              embedMode
              embeddedCta={(planName) => {
                if (planName === 'Free') {
                  navigate('/signup');
                  return;
                }
                if (planName === 'Pro') {
                  window.location.assign('/#pricing');
                  return;
                }
                window.location.assign('/#pricing');
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
