import React from 'react';

/**
 * Flowfex Logo Component
 * Handcrafted SVG that precisely matches the user's provided node-text design
 * Adapted to use the historically rare color palette
 */
function FlowfexLogo({ 
  size = 40, 
  animated = false, 
  variant = 'full', // 'full' | 'icon' | 'wordmark'
  className = ''
}) {
  const colors = {
    primary: '#9E3028',      // Sinoper - main accent
    secondary: '#D4A840',    // Massicot Glow
    accent: '#8B5B38',       // Mummy Brown
    light: '#EDE8DF',        // Velin - light text
  };

  // Base font settings to get the thick, rounded look
  const fontStyle = {
    fontFamily: '"Satoshi", "Fredoka One", "Nunito", system-ui, sans-serif',
    fontWeight: 900,
    letterSpacing: '-0.02em',
  };

  const animationStyles = animated ? (
    <style>
      {`
        @keyframes flowPulseTop {
          0%, 100% { filter: drop-shadow(0 0 2px ${colors.secondary}); }
          50% { filter: drop-shadow(0 0 8px ${colors.secondary}); }
        }
        @keyframes flowPulseBottom {
          0%, 100% { filter: drop-shadow(0 0 2px ${colors.primary}); }
          50% { filter: drop-shadow(0 0 8px ${colors.primary}); }
        }
        .flowfex-logo-nodes-top.animated {
          animation: flowPulseTop 2.4s ease-in-out infinite;
        }
        .flowfex-logo-nodes-bottom.animated {
          animation: flowPulseBottom 2.4s ease-in-out 0.6s infinite;
        }
      `}
    </style>
  ) : null;

  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flowfex-logo-icon ${className}`}
      >
        {animationStyles}
        {/* The F icon with top nodes */}
        <g 
          className={animated ? "flowfex-logo-nodes-top animated" : "flowfex-logo-nodes-top"}
          transform="translate(50, 32)" 
          fill="none" 
          stroke={colors.primary} 
          strokeWidth="6" 
          strokeLinecap="round"
        >
          <path d="M -18,12 A 18,18 0 0,1 18,12" />
          <circle cx="-18" cy="12" r="6" />
          <circle cx="18" cy="12" r="6" />
        </g>
        <text
          x="50"
          y="80"
          style={fontStyle}
          fontSize="68"
          fill={colors.light}
          textAnchor="middle"
        >
          F
        </text>
      </svg>
    );
  }

  if (variant === 'wordmark') {
    return (
      <svg
        width={size * 3}
        height={size}
        viewBox="0 0 240 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flowfex-logo-wordmark ${className}`}
      >
        <text
          x="120"
          y="56"
          style={fontStyle}
          fontSize="48"
          fill={colors.light}
          textAnchor="middle"
        >
          Flowfex
        </text>
      </svg>
    );
  }

  // Full logo: Text with top nodes on the F and bottom nodes on the x
  return (
    <svg
      width={size * 4.5}
      height={size}
      viewBox="0 0 280 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flowfex-logo-full ${className}`}
    >
      {animationStyles}
      {/* Headphone nodes above 'F' */}
      <g 
        className={animated ? "flowfex-logo-nodes-top animated" : "flowfex-logo-nodes-top"}
        transform="translate(42, 28)" 
        fill="none" 
        stroke={colors.secondary} 
        strokeWidth="4" 
        strokeLinecap="round"
      >
        <path d="M -12,8 A 12,12 0 0,1 12,8" />
        <circle cx="-12" cy="8" r="4.5" />
        <circle cx="12" cy="8" r="4.5" />
      </g>

      {/* Wordmark */}
      <text
        x="30"
        y="62"
        style={fontStyle}
        fontSize="52"
        fill={colors.light}
      >
        Flowfex
      </text>

      {/* Nodes below 'x' */}
      <g 
        className={animated ? "flowfex-logo-nodes-bottom animated" : "flowfex-logo-nodes-bottom"}
        transform="translate(230, 68)" 
        fill="none" 
        stroke={colors.primary} 
        strokeWidth="3.5" 
        strokeLinecap="round"
      >
        <path d="M -10,-6 A 10,10 0 0,0 10,-6" />
        <circle cx="-10" cy="-6" r="3.5" />
        <circle cx="10" cy="-6" r="3.5" />
      </g>
    </svg>
  );
}

export default FlowfexLogo;

