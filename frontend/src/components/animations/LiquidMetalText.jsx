// LiquidMetalText.jsx - Liquid Metal Typography Effect
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
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
      containerRef.current.appendChild(span);

      // Liquid metal reveal animation
      gsap.fromTo(span,
        {
          filter: 'blur(20px)',
          opacity: 0,
          scale: 1.2,
          textShadow: '0 0 40px rgba(158, 48, 40, 0.8)'
        },
        {
          filter: 'blur(0px)',
          opacity: 1,
          scale: 1,
          textShadow: '0 0 20px rgba(196, 149, 48, 0.3)',
          duration: 0.4,
          delay: 0.4 + i * 0.028,
          ease: 'power2.out'
        }
      );
    });

    // Add hover micro-interactions
    const handleCharHover = (e) => {
      if (e.target.classList.contains('liquid-char')) {
        gsap.to(e.target, {
          z: 10,
          scale: 1.05,
          textShadow: '0 0 30px rgba(196, 149, 48, 0.5)',
          duration: 0.2,
          ease: 'power2.out'
        });
      }
    };

    const handleCharLeave = (e) => {
      if (e.target.classList.contains('liquid-char')) {
        gsap.to(e.target, {
          z: 0,
          scale: 1,
          textShadow: '0 0 20px rgba(196, 149, 48, 0.3)',
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    containerRef.current.addEventListener('mouseover', handleCharHover);
    containerRef.current.addEventListener('mouseout', handleCharLeave);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseover', handleCharHover);
        containerRef.current.removeEventListener('mouseout', handleCharLeave);
      }
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`liquid-metal-text ${className}`}
      style={{ perspective: '1000px' }}
    />
  );
}
