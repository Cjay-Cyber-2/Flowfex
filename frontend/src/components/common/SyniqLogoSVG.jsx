import React from 'react';
import syniqLogo from '../../assets/syniq-logo.png';

/**
 * Syniq brand mark — renders the official transparent logo asset.
 *
 * Props
 *  size      – width/height in px (square viewBox)
 *  className – extra class names
 *  animated  – when true, adds a gentle idle pulse + sparkle shimmer
 *  style     – passthrough inline styles
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
