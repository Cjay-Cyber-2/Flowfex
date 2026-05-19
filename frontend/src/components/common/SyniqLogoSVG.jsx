import React from 'react';

/**
 * Syniq brand mark — pure SVG, infinitely scalable, no pixelation.
 * Renders the cyan hexagonal-Q with a 4-pointed star center and glassy finish.
 */
export default function SyniqLogoSVG({
  size = 32,
  className = '',
  animated = false,
  style = {},
}) {
  const s = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      viewBox="0 0 200 232"
      xmlns="http://www.w3.org/2000/svg"
      className={`syniq-logo-svg ${animated ? 'syniq-logo-svg--animated' : ''} ${className}`.trim()}
      style={{
        width: s,
        height: s,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sq-g" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#5EFCE3" />
          <stop offset="40%" stopColor="#00E5C3" />
          <stop offset="100%" stopColor="#00C9A7" />
        </linearGradient>
        <linearGradient id="sq-sh" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sq-st" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#7AFFF0" />
          <stop offset="100%" stopColor="#00D4AA" />
        </linearGradient>
        <filter id="sq-gw">
          <feDropShadow dx="0" dy="1.5" stdDeviation="3" floodColor="#00D4AA" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Hexagonal Q body with tail — outer minus inner hole */}
      <path
        d={
          // Outer hexagonal Q (clockwise)
          'M 100 14 C 106 14 110 16 114 19 L 174 54 C 180 58 184 65 184 73 L 184 139 ' +
          'C 184 147 180 153 174 157 L 144 175 C 136 180 128 190 124 200 L 116 222 ' +
          'C 114 227 109 229 105 227 C 101 225 100 220 102 215 L 110 196 ' +
          'C 114 186 108 178 98 176 L 26 157 C 20 153 16 147 16 139 L 16 73 ' +
          'C 16 65 20 58 26 54 L 86 19 C 90 16 94 14 100 14 Z ' +
          // Inner hole (clockwise, evenodd cuts it out)
          'M 100 62 C 94 62 90 64 86 67 L 56 86 C 52 89 49 94 49 100 ' +
          'L 49 112 C 49 118 52 123 56 126 L 86 145 C 90 148 94 150 100 150 ' +
          'C 106 150 110 148 114 145 L 144 126 C 148 123 151 118 151 112 ' +
          'L 151 100 C 151 94 148 89 144 86 L 114 67 C 110 64 106 62 100 62 Z'
        }
        fill="url(#sq-g)"
        fillRule="evenodd"
        filter="url(#sq-gw)"
      />

      {/* 4-pointed diamond star in center */}
      <path
        d="M 100 80 L 107 96 L 123 103 L 107 110 L 100 126 L 93 110 L 77 103 L 93 96 Z"
        fill="url(#sq-st)"
      />

      {/* Glassy sheen on upper half */}
      <path
        d={
          'M 100 14 C 106 14 110 16 114 19 L 174 54 C 180 58 184 65 184 73 ' +
          'L 184 106 L 16 106 L 16 73 C 16 65 20 58 26 54 L 86 19 C 90 16 94 14 100 14 Z'
        }
        fill="url(#sq-sh)"
      />
    </svg>
  );
}
