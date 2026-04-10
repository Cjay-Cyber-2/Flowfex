// FlowfexLogoNew.jsx - Your custom logo with webapp color matching and animation
import React from 'react';

export default function FlowfexLogoNew({ size = 32, animated = true, className = '' }) {
  return (
    <div 
      className={`flowfex-logo ${animated ? 'animated' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main logo circles - recolored to match webapp */}
        <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="logo-circle-1" />
        <circle cx="15" cy="50" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" className="logo-circle-2" />
        <circle cx="45" cy="50" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" className="logo-circle-3" />
        
        {/* Flowfex text */}
        <path d="M70 20 L70 55 M70 20 L95 20 M70 35 L90 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="logo-text" />
        <circle cx="105" cy="37.5" r="17.5" stroke="currentColor" strokeWidth="3" fill="none" className="logo-text" />
        <path d="M130 55 L130 20 L145 35 L160 20 L160 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="logo-text" />
        <path d="M170 20 L170 55 M170 20 L185 35 L170 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="logo-text" />
        
        {/* Connection circles on the right */}
        <circle cx="160" cy="65" r="8" stroke="currentColor" strokeWidth="2" fill="none" className="logo-circle-4" />
        <circle cx="180" cy="65" r="8" stroke="currentColor" strokeWidth="2" fill="none" className="logo-circle-5" />
        <circle cx="170" cy="45" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" className="logo-circle-6" />
      </svg>
      
      <style jsx>{`
        .flowfex-logo {
          color: var(--color-massicot);
          transition: all 0.3s ease;
        }
        
        .flowfex-logo:hover {
          color: var(--color-sinoper);
        }
        
        .flowfex-logo.animated .logo-circle-1 {
          animation: logoOrbit1 8s ease-in-out infinite;
        }
        
        .flowfex-logo.animated .logo-circle-2 {
          animation: logoOrbit2 6s ease-in-out infinite;
        }
        
        .flowfex-logo.animated .logo-circle-3 {
          animation: logoOrbit3 7s ease-in-out infinite;
        }
        
        .flowfex-logo.animated .logo-circle-4 {
          animation: logoPulse 4s ease-in-out infinite;
        }
        
        .flowfex-logo.animated .logo-circle-5 {
          animation: logoPulse 4s ease-in-out infinite 0.5s;
        }
        
        .flowfex-logo.animated .logo-circle-6 {
          animation: logoFlow 5s ease-in-out infinite;
        }
        
        @keyframes logoOrbit1 {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
        }
        
        @keyframes logoOrbit2 {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes logoOrbit3 {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes logoPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        @keyframes logoFlow {
          0%, 100% { stroke-dasharray: 0 100; }
          50% { stroke-dasharray: 50 50; }
        }
      `}</style>
    </div>
  );
}
