import React from 'react';
import syniqLogo from '../../assets/syniq-logo-v3.png';

/**
 * Syniq brand mark — official transparent raster (syniq-logo-v3.png).
 * Regenerate from source art with frontend/scripts/clean_syniq_logo_png.py
 * after exports so disconnected corner blobs are stripped.
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
