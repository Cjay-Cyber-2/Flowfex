import React from 'react';
import SyniqLogoSVG from './SyniqLogoSVG';

export default function ThreeDLogoMark({
  className = '',
  alt = '',
  glow = 'soft',
  sheen = true,
}) {
  const decorative = !alt;
  const glowClass = glow === 'none' ? 'three-d-logo-mark-glow-none' : 'three-d-logo-mark-glow-soft';

  return (
    <div
      className={`three-d-logo-mark three-d-logo-mark--image ${glowClass} ${sheen ? '' : 'three-d-logo-mark-no-sheen'} ${className}`.trim()}
      aria-hidden={decorative || undefined}
    >
      <div className="three-d-logo-mark-stack">
        <div className="three-d-logo-mark-front-shell">
          <div
            className="three-d-logo-mark-front"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SyniqLogoSVG size="100%" />
          </div>
        </div>
        {sheen ? <div className="three-d-logo-mark-sheen" /> : null}
      </div>
    </div>
  );
}
