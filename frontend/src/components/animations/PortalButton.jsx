import React from 'react';
import BorderGlow from './BorderGlow';
import './PortalButton.css';

export default function PortalButton({ children, onClick, className = '' }) {
  return (
    <BorderGlow
      className={`portal-button ${className}`}
      onClick={onClick}
      edgeSensitivity={30}
      glowColor="160 70 60"
      backgroundColor="#0d1319"
      borderRadius={999}
      glowRadius={20}
      glowIntensity={0.8}
      coneSpread={30}
      colors={['#22d3ee', '#34d399', '#a78bfa']}
      fillOpacity={0.4}
    >
      <span className="portal-content">{children}</span>
    </BorderGlow>
  );
}
