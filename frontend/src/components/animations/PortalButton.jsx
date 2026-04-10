// PortalButton.jsx - Enhanced CTA Button with Particle Effects (Pure JS)
import React, { useRef, useEffect } from 'react';
import './PortalButton.css';

export default function PortalButton({ children, onClick, className = '' }) {
  const buttonRef = useRef(null);

  const handleClick = (e) => {
    // Simple scale animation
    const button = buttonRef.current;
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 100);

    if (onClick) {
      setTimeout(() => onClick(e), 300);
    }
  };

  return (
    <button
      ref={buttonRef}
      className={`portal-button ${className}`}
      onClick={handleClick}
    >
      <span className="portal-content">{children}</span>
    </button>
  );
}
