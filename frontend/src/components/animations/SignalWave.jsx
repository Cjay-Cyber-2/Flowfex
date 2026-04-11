// SignalWave.jsx - Circular Shockwave Animation (Pure CSS/JS)
import React, { useEffect, useRef } from 'react';

export default function SignalWave() {
  const containerRef = useRef(null);

  useEffect(() => {
    const createWave = () => {
      const wave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      wave.setAttribute('cx', '50%');
      wave.setAttribute('cy', '50%');
      wave.setAttribute('r', '0');
      wave.setAttribute('fill', 'none');
      wave.setAttribute('stroke', '#00D4AA');
      wave.setAttribute('stroke-width', '2');
      wave.style.opacity = '0.45';
      
      containerRef.current.appendChild(wave);

      // Animate with CSS
      let start = null;
      const duration = 3200;
      
      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;
        
        if (progress < 1) {
          wave.setAttribute('r', progress * 1900);
          wave.style.opacity = 0.45 * (1 - progress);
          requestAnimationFrame(animate);
        } else {
          wave.remove();
        }
      };
      
      requestAnimationFrame(animate);
    };

    // Create wave every 6 seconds
    const interval = setInterval(createWave, 7000);
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
