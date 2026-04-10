// LiquidMetalText.jsx - Liquid Metal Typography Effect (Pure JS)
import React, { useEffect, useRef } from 'react';
import './LiquidMetalText.css';

export default function LiquidMetalText({ text, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = text.split('');
    containerRef.current.innerHTML = '';

    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.className = 'liquid-char';
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'scale(1.2)';
      span.style.filter = 'blur(20px)';
      containerRef.current.appendChild(span);

      // Animate with requestAnimationFrame
      setTimeout(() => {
        let start = null;
        const duration = 400;
        
        const animate = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          
          span.style.opacity = progress;
          span.style.transform = `scale(${1.2 - 0.2 * progress})`;
          span.style.filter = `blur(${20 * (1 - progress)}px)`;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
      }, 400 + i * 28);
    });
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`liquid-metal-text ${className}`}
      style={{ perspective: '1000px' }}
    />
  );
}
