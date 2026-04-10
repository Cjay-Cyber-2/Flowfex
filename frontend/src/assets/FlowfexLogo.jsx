import React from 'react';

/**
 * Flowfex Logo Component
 * Adapted to use the historically rare color palette
 * Features animated nodes that represent AI orchestration
 * 
 * The logo represents the flow of intelligence through connected nodes,
 * perfectly embodying the product's core concept of visible AI orchestration.
 */
function FlowfexLogo({ 
  size = 40, 
  animated = false, 
  variant = 'full', // 'full' | 'icon' | 'wordmark'
  className = ''
}) {
  const colors = {
    primary: '#9E3028',      // Sinoper - main accent
    secondary: '#C49530',    // Massicot - highlight
    accent: '#8B5B38',       // Mummy Brown - secondary
    light: '#EDE8DF',        // Velin - light text
  };

  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flowfex-logo-icon ${animated ? 'animated' : ''} ${className}`}
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        {animated && (
          <style>
            {`
              @keyframes nodePulse1 {
                0%, 100% { opacity: 1; r: 18; }
                50% { opacity: 0.7; r: 20; }
              }
              @keyframes nodePulse2 {
                0%, 100% { opacity: 1; r: 12; }
                50% { opacity: 0.7; r: 14; }
              }
              @keyframes connectionGlow {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.8; }
              }
              .flowfex-logo-icon.animated .node-1 {
                animation: nodePulse1 2.4s ease-in-out infinite;
              }
              .flowfex-logo-icon.animated .node-2 {
                animation: nodePulse2 2.4s ease-in-out 0.3s infinite;
              }
              .flowfex-logo-icon.animated .node-3 {
                animation: nodePulse2 2.4s ease-in-out 0.6s infinite;
              }
              .flowfex-logo-icon.animated .node-4 {
                animation: nodePulse1 2.4s ease-in-out 0.9s infinite;
              }
              .flowfex-logo-icon.animated .node-5 {
                animation: nodePulse1 2.4s ease-in-out 1.2s infinite;
              }
              .flowfex-logo-icon.animated .connection {
                animation: connectionGlow 2s ease-in-out infinite;
              }
            `}
          </style>
        )}
        
        {/* Top large node */}
        <circle cx="60" cy="30" r="18" stroke={colors.primary} strokeWidth="4" fill="none" className="node-1" />
        
        {/* Left small node */}
        <circle cx="25" cy="65" r="12" stroke={colors.secondary} strokeWidth="4" fill="none" className="node-2" />
        
        {/* Right small node */}
        <circle cx="95" cy="65" r="12" stroke={colors.accent} strokeWidth="4" fill="none" className="node-3" />
        
        {/* Bottom left node */}
        <circle cx="40" cy="95" r="15" stroke={colors.secondary} strokeWidth="4" fill="none" className="node-4" />
        
        {/* Bottom right node */}
        <circle cx="80" cy="95" r="15" stroke={colors.primary} strokeWidth="4" fill="none" className="node-5" />
        
        {/* Connections */}
        <line x1="60" y1="48" x2="30" y2="60" stroke={colors.primary} strokeWidth="2.5" opacity="0.4" className="connection" />
        <line x1="60" y1="48" x2="90" y2="60" stroke={colors.primary} strokeWidth="2.5" opacity="0.4" className="connection" />
        <line x1="25" y1="77" x2="40" y2="85" stroke={colors.secondary} strokeWidth="2.5" opacity="0.4" className="connection" />
        <line x1="95" y1="77" x2="80" y2="85" stroke={colors.accent} strokeWidth="2.5" opacity="0.4" className="connection" />
      </svg>
    );
  }

  if (variant === 'wordmark') {
    return (
      <svg
        width={size * 3}
        height={size}
        viewBox="0 0 300 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flowfex-logo-wordmark ${className}`}
      >
        <text
          x="0"
          y="60"
          fontFamily="var(--font-geist)"
          fontSize="48"
          fontWeight="800"
          letterSpacing="0.1em"
          fill={colors.light}
        >
          FLOWFEX
        </text>
      </svg>
    );
  }

  // Full logo with icon + wordmark
  return (
    <svg
      width={size * 5}
      height={size}
      viewBox="0 0 400 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flowfex-logo-full ${animated ? 'animated' : ''} ${className}`}
    >
      {animated && (
        <style>
          {`
            @keyframes nodePulse1 {
              0%, 100% { opacity: 1; r: 12; }
              50% { opacity: 0.7; r: 13.5; }
            }
            @keyframes nodePulse2 {
              0%, 100% { opacity: 1; r: 8; }
              50% { opacity: 0.7; r: 9.5; }
            }
            @keyframes connectionGlow {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.8; }
            }
            @keyframes textGlow {
              0%, 100% { filter: drop-shadow(0 0 4px ${colors.primary}40); }
              50% { filter: drop-shadow(0 0 8px ${colors.primary}60); }
            }
            .flowfex-logo-full.animated .node-1 {
              animation: nodePulse1 2.4s ease-in-out infinite;
            }
            .flowfex-logo-full.animated .node-2 {
              animation: nodePulse2 2.4s ease-in-out 0.3s infinite;
            }
            .flowfex-logo-full.animated .node-3 {
              animation: nodePulse2 2.4s ease-in-out 0.6s infinite;
            }
            .flowfex-logo-full.animated .node-4 {
              animation: nodePulse1 2.4s ease-in-out 0.9s infinite;
            }
            .flowfex-logo-full.animated .node-5 {
              animation: nodePulse1 2.4s ease-in-out 1.2s infinite;
            }
            .flowfex-logo-full.animated .connection {
              animation: connectionGlow 2s ease-in-out infinite;
            }
            .flowfex-logo-full.animated .wordmark {
              animation: textGlow 3s ease-in-out infinite;
            }
          `}
        </style>
      )}
      
      {/* Icon part */}
      <g transform="translate(10, 10)">
        <circle cx="40" cy="20" r="12" stroke={colors.primary} strokeWidth="3" fill="none" className="node-1" />
        <circle cx="17" cy="43" r="8" stroke={colors.secondary} strokeWidth="3" fill="none" className="node-2" />
        <circle cx="63" cy="43" r="8" stroke={colors.accent} strokeWidth="3" fill="none" className="node-3" />
        <circle cx="27" cy="63" r="10" stroke={colors.secondary} strokeWidth="3" fill="none" className="node-4" />
        <circle cx="53" cy="63" r="10" stroke={colors.primary} strokeWidth="3" fill="none" className="node-5" />
        
        <line x1="40" y1="32" x2="20" y2="40" stroke={colors.primary} strokeWidth="2" opacity="0.4" className="connection" />
        <line x1="40" y1="32" x2="60" y2="40" stroke={colors.primary} strokeWidth="2" opacity="0.4" className="connection" />
        <line x1="17" y1="51" x2="27" y2="56" stroke={colors.secondary} strokeWidth="2" opacity="0.4" className="connection" />
        <line x1="63" y1="51" x2="53" y2="56" stroke={colors.accent} strokeWidth="2" opacity="0.4" className="connection" />
      </g>
      
      {/* Wordmark */}
      <text
        x="100"
        y="55"
        fontFamily="var(--font-geist)"
        fontSize="36"
        fontWeight="800"
        letterSpacing="0.1em"
        fill={colors.light}
        className="wordmark"
      >
        FLOWFEX
      </text>
    </svg>
  );
}

export default FlowfexLogo;
