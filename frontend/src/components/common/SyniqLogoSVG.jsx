import React from 'react';
import syniqLogo from '../../assets/syniq-logo-v2.png';

/**
 * Syniq brand mark — renders the official transparent logo asset
 * with a premium glassmorphism finish.
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
    <div
      className={`syniq-logo-svg-wrap ${animated ? 'syniq-logo-svg-wrap--animated' : ''} ${className}`.trim()}
      style={{
        width: resolvedSize,
        height: resolvedSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        ...style,
      }}
    >
      <img
        src={syniqLogo}
        className={`syniq-logo-svg ${animated ? 'syniq-logo-svg--animated' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 8px rgba(0, 212, 170, 0.35)) drop-shadow(0 0 2px rgba(127, 255, 240, 0.2))',
        }}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      {/* Glassy sheen overlay */}
      <span
        className="syniq-logo-glass-sheen"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '8%',
          borderRadius: '28%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, transparent 60%, rgba(127,255,240,0.08) 100%)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          opacity: 0.7,
        }}
      />
    </div>
  );
}
