// SignalWave.jsx - Circular Shockwave Animation
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function SignalWave() {
  const waveRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const createWave = () => {
      const wave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      wave.setAttribute('cx', '50%');
      wave.setAttribute('cy', '50%');
      wave.setAttribute('r', '0');
      wave.setAttribute('fill', 'none');
      wave.setAttribute('stroke', '#9E3028');
      wave.setAttribute('stroke-width', '2');
      
      containerRef.current.appendChild(wave);

      gsap.to(wave, {
        attr: { r: 2000 },
        opacity: 0,
        duration: 3,
        ease: 'power2.out',
        onComplete: () => {
          wave.remove();
        }
      });

      // Pulse nearby particles (if particle system is present)
      const event = new CustomEvent('signalWave', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    };

    // Create wave every 8 seconds
    const interval = setInterval(createWave, 8000);
    createWave(); // Initial wave

    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible'
      }}
    />
  );
}
