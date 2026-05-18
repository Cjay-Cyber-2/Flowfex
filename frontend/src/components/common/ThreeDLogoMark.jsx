import React from 'react';
import SyniqLogoSVG from './SyniqLogoSVG';

function buildLayers(depth) {
  return Array.from({ length: depth }, (_, index) => index);
}

export default function ThreeDLogoMark({
  className = '',
  depth = 8,
  alt = '',
  glow = 'soft',
  sheen = true,
}) {
  const decorative = !alt;
  const layers = buildLayers(depth);
  const glowClass = glow === 'none' ? 'three-d-logo-mark-glow-none' : 'three-d-logo-mark-glow-soft';

  return (
    <div
      className={`three-d-logo-mark ${glowClass} ${sheen ? '' : 'three-d-logo-mark-no-sheen'} ${className}`.trim()}
      aria-hidden={decorative || undefined}
    >
      {glow !== 'none' ? <div className="three-d-logo-mark-aura three-d-logo-mark-aura-primary" /> : null}
      {glow !== 'none' ? <div className="three-d-logo-mark-aura three-d-logo-mark-aura-secondary" /> : null}
      <div className="three-d-logo-mark-stack">
        {layers.map((layerIndex) => (
          <div
            key={layerIndex}
            className="three-d-logo-mark-layer"
            style={{
              '--logo-layer-index': layerIndex,
              '--logo-layer-depth': `${(depth - layerIndex) * 4}px`,
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
        ))}
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
