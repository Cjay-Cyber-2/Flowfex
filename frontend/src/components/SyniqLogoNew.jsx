import React from 'react';

export default function SyniqLogoNew({ size = 32, animated = false, className = '' }) {
  return (
    <span 
      className={`syniq-text-logo ${className} ${animated ? 'animated' : ''}`}
      style={{
        fontSize: size,
        fontWeight: 800,
        fontFamily: '"Inter", sans-serif',
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        userSelect: 'none'
      }}
    >
      <span style={{ color: '#e8edf2' }}>Syn-</span>
      <span style={{ 
        background: 'linear-gradient(135deg, #00d4aa 0%, #0088ff 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 20px rgba(0, 212, 170, 0.4)'
      }}>IQ</span>
    </span>
  );
}
