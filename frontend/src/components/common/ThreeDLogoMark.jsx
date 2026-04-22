import React from 'react';
import flowfexLogo from '../../assets/flowfex-logo-official.png';

function buildLayers(depth) {
  return Array.from({ length: depth }, (_, index) => index);
}

export default function ThreeDLogoMark({
  className = '',
  depth = 8,
  alt = '',
}) {
  const decorative = !alt;
  const layers = buildLayers(depth);

  return (
    <div className={`three-d-logo-mark ${className}`.trim()} aria-hidden={decorative || undefined}>
      <div className="three-d-logo-mark-aura three-d-logo-mark-aura-primary" />
      <div className="three-d-logo-mark-aura three-d-logo-mark-aura-secondary" />
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
        <div className="three-d-logo-mark-sheen" />
      </div>
    </div>
  );
}
