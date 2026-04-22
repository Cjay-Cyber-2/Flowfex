import React from 'react';
import flowfexLogo from '../../assets/flowfex-logo-official.png';

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
          <img
            key={layerIndex}
            src={flowfexLogo}
            alt=""
            className="three-d-logo-mark-layer"
            style={{
              '--logo-layer-index': layerIndex,
              '--logo-layer-depth': `${(depth - layerIndex) * 4}px`,
            }}
            draggable="false"
          />
        ))}
        <div className="three-d-logo-mark-front-shell">
          <img
            src={flowfexLogo}
            alt={alt}
            className="three-d-logo-mark-front"
            draggable="false"
          />
        </div>
        {sheen ? <div className="three-d-logo-mark-sheen" /> : null}
      </div>
    </div>
  );
}
