import React from 'react';
import flowfexLogo from '../assets/flowfex-logo-ui.png';

export default function FlowfexLogoNew({ size = 32, animated = true, className = '' }) {
  const width = Math.round(size * (1024 / 712));

  return (
    <span
      className={`flowfex-logo-mark ${animated ? 'is-animated' : ''} ${className}`}
      style={{ width, height: size }}
    >
      <span className="flowfex-logo-mark-glow" aria-hidden="true" />
      <img src={flowfexLogo} alt="Flowfex" className="flowfex-logo-mark-image" draggable="false" />

      <style>{`
        .flowfex-logo-mark {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 180ms ease, filter 180ms ease;
        }

        .flowfex-logo-mark-glow {
          position: absolute;
          inset: 12% 16%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 212, 170, 0.18), rgba(0, 212, 170, 0));
          filter: blur(16px);
          opacity: 0.72;
          pointer-events: none;
        }

        .flowfex-logo-mark-image {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: saturate(1.04) brightness(1.02);
          user-select: none;
        }

        .flowfex-logo-mark:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 0 12px rgba(0, 212, 170, 0.14));
        }

        .flowfex-logo-mark.is-animated .flowfex-logo-mark-glow {
          animation: flowfexLogoGlow 3.4s ease-in-out infinite;
        }

        .flowfex-logo-mark.is-animated .flowfex-logo-mark-image {
          animation: flowfexLogoFloat 4.8s ease-in-out infinite;
        }

        @keyframes flowfexLogoGlow {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.04);
          }
        }

        @keyframes flowfexLogoFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1px);
          }
        }
      `}</style>
    </span>
  );
}
