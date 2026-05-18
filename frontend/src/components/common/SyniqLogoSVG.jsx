import React from 'react';

/**
 * Syniq brand mark — pure SVG, infinitely scalable, no raster assets.
 *
 * The mark is a rounded hexagonal shape with a flowing tail and a
 * four-pointed diamond sparkle at its centre.  Colours follow the
 * Syniq palette: dark navy body with subtle cyan-to-purple gradient
 * accents on the edges and sparkle.
 *
 * Props
 * ─────
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
  const uniqueId = React.useId?.() || 'slg';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`syniq-logo-svg ${animated ? 'syniq-logo-svg--animated' : ''} ${className}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
      role="img"
    >
      <defs>
        {/* Main body gradient — dark navy */}
        <linearGradient id={`${uniqueId}-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2d3a" />
          <stop offset="50%" stopColor="#1e2030" />
          <stop offset="100%" stopColor="#16182a" />
        </linearGradient>

        {/* Edge highlight — subtle cyan-to-purple */}
        <linearGradient id={`${uniqueId}-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7ffff0" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#00d4aa" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.5" />
        </linearGradient>

        {/* Sparkle gradient — cyan to purple */}
        <linearGradient id={`${uniqueId}-sparkle`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7ffff0" />
          <stop offset="40%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>

        {/* Soft outer glow */}
        <filter id={`${uniqueId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Sparkle glow filter */}
        <filter id={`${uniqueId}-sparkleGlow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ─── Main hexagonal body with flowing tail ─── */}
      <g filter={`url(#${uniqueId}-glow)`}>
        {/* Outer edge highlight (slightly larger, semi-transparent) */}
        <path
          d="
            M 256 52
            C 310 52, 370 72, 410 112
            C 450 152, 464 200, 464 256
            C 464 312, 450 360, 410 400
            C 370 440, 310 460, 256 460
            C 202 460, 148 440, 108 400
            C 68 360, 48 312, 48 256
            C 48 200, 68 152, 108 112
            C 148 72, 202 52, 256 52
            Z
          "
          fill="none"
          stroke={`url(#${uniqueId}-edge)`}
          strokeWidth="3"
          opacity="0.6"
        />

        {/* Main body — rounded hexagonal shape */}
        <path
          d="
            M 256 62
            C 306 62, 362 80, 400 118
            C 438 156, 454 204, 454 256
            C 454 308, 438 356, 400 394
            C 362 432, 306 450, 256 450
            C 206 450, 152 432, 114 394
            C 76 356, 58 308, 58 256
            C 58 204, 76 156, 114 118
            C 152 80, 206 62, 256 62
            Z
          "
          fill={`url(#${uniqueId}-body)`}
        />

        {/* Flowing tail curving down-left */}
        <path
          d="
            M 140 380
            C 120 410, 100 440, 110 462
            C 116 478, 135 480, 150 470
            C 170 456, 172 430, 160 408
            C 152 392, 144 386, 140 380
            Z
          "
          fill={`url(#${uniqueId}-body)`}
        />

        {/* Inner cutout / window — lighter area */}
        <path
          d="
            M 256 130
            C 290 130, 330 148, 355 173
            C 380 198, 394 232, 394 262
            C 394 292, 380 326, 355 351
            C 330 376, 290 394, 256 394
            C 222 394, 182 376, 157 351
            C 132 326, 118 292, 118 262
            C 118 232, 132 198, 157 173
            C 182 148, 222 130, 256 130
            Z
          "
          fill="#0d1117"
          opacity="0.85"
        />

        {/* Second inner ring to form the "window" effect */}
        <path
          d="
            M 256 155
            C 284 155, 318 170, 338 190
            C 358 210, 370 238, 370 262
            C 370 286, 358 314, 338 334
            C 318 354, 284 369, 256 369
            C 228 369, 194 354, 174 334
            C 154 314, 142 286, 142 262
            C 142 238, 154 210, 174 190
            C 194 170, 228 155, 256 155
            Z
          "
          fill="rgba(255,255,255,0.04)"
        />

        {/* ─── Four-pointed diamond sparkle ─── */}
        <g filter={`url(#${uniqueId}-sparkleGlow)`}>
          <path
            className="syniq-logo-svg-sparkle"
            d="
              M 256 230
              C 260 242, 268 250, 280 256
              C 268 262, 260 270, 256 282
              C 252 270, 244 262, 232 256
              C 244 250, 252 242, 256 230
              Z
            "
            fill={`url(#${uniqueId}-sparkle)`}
          />
        </g>

        {/* Subtle top-left highlight for 3D depth */}
        <ellipse
          cx="200"
          cy="160"
          rx="60"
          ry="40"
          fill="rgba(255,255,255,0.06)"
          transform="rotate(-20, 200, 160)"
        />
      </g>

      {animated && (
        <style>{`
          .syniq-logo-svg--animated {
            animation: syniqLogoPulse 3s ease-in-out infinite;
          }
          .syniq-logo-svg--animated .syniq-logo-svg-sparkle {
            animation: syniqSparkleShimmer 2.4s ease-in-out infinite;
            transform-origin: 256px 256px;
          }
          @keyframes syniqLogoPulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(0, 212, 170, 0)); }
            50% { transform: scale(1.04); filter: drop-shadow(0 0 12px rgba(0, 212, 170, 0.3)); }
          }
          @keyframes syniqSparkleShimmer {
            0%, 100% { opacity: 0.8; transform: scale(1) rotate(0deg); }
            50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
          }
        `}</style>
      )}
    </svg>
  );
}
