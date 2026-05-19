import React from 'react';
import syniqLogo from '../../assets/syniq-logo-v2.png';

/**
 * Syniq brand mark — renders the official transparent logo asset.
 * Uses a high-resolution PNG with transparent background for the
 * glassy 3D look of the original design. The image is rendered
 * with object-fit: contain so it stays crisp at every size.
 */
export default function SyniqLogoSVG({
  size = 32,
  className = '',
  animated = false,
  style = {},
}) {
  const resolvedSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={syniqLogo}
      className={`syniq-logo-svg ${animated ? 'syniq-logo-svg--animated' : ''} ${className}`.trim()}
      style={{
        width: resolvedSize,
        height: resolvedSize,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}
