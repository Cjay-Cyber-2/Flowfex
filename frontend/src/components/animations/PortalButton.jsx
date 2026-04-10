// PortalButton.jsx - Enhanced CTA Button with Particle Effects
import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import './PortalButton.css';

export default function PortalButton({ children, onClick, className = '' }) {
  const buttonRef = useRef(null);
  const glowRef = useRef(null);
  const particleContainerRef = useRef(null);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Create orbital particles
    const particleCount = 12;
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        angle: (i / particleCount) * Math.PI * 2,
        speed: 1
      });
    }
    
    setParticles(newParticles);

    // Animate glow rotation
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        rotation: 360,
        duration: 8,
        repeat: -1,
        ease: 'none'
      });
    }

    // Animate orbital particles
    const animateParticles = () => {
      particles.forEach((particle, i) => {
        const particleEl = particleContainerRef.current?.children[i];
        if (particleEl) {
          particle.angle += 0.02 * particle.speed;
          const radius = 60;
          const x = Math.cos(particle.angle) * radius;
          const y = Math.sin(particle.angle) * radius;
          
          gsap.set(particleEl, {
            x: x,
            y: y,
            opacity: 0.6 + Math.sin(particle.angle * 2) * 0.4
          });
        }
      });
      
      requestAnimationFrame(animateParticles);
    };

    if (particles.length > 0) {
      animateParticles();
    }
  }, [particles.length]);

  const handleHover = () => {
    // Intensify glow
    gsap.to(glowRef.current, {
      scale: 1.2,
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out'
    });

    // Accelerate particles
    particles.forEach(p => p.speed = 3);

    // Scale button
    gsap.to(buttonRef.current, {
      scale: 1.05,
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)'
    });
  };

  const handleLeave = () => {
    // Reset glow
    gsap.to(glowRef.current, {
      scale: 1,
      opacity: 0.7,
      duration: 0.3,
      ease: 'power2.out'
    });

    // Reset particle speed
    particles.forEach(p => p.speed = 1);

    // Reset button scale
    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  };

  const handleClick = (e) => {
    // Implosion effect
    gsap.to(buttonRef.current, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(buttonRef.current, {
          scale: 1,
          duration: 0.2,
          ease: 'elastic.out(1, 0.5)'
        });
      }
    });

    // Particle burst
    const burst = createParticleBurst(e.clientX, e.clientY);
    document.body.appendChild(burst);

    // Shockwave
    createShockwave(e.clientX, e.clientY);

    // Call original onClick
    if (onClick) {
      setTimeout(() => onClick(e), 300);
    }
  };

  const createParticleBurst = (x, y) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.pointerEvents = 'none';
    container.style.zIndex = '10000';

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'burst-particle';
      particle.style.position = 'absolute';
      particle.style.width = '4px';
      particle.style.height = '4px';
      particle.style.borderRadius = '50%';
      particle.style.backgroundColor = i % 2 === 0 ? '#9E3028' : '#C49530';
      
      container.appendChild(particle);

      const angle = (i / 30) * Math.PI * 2;
      const distance = 100 + Math.random() * 100;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      gsap.to(particle, {
        x: tx,
        y: ty,
        opacity: 0,
        scale: 0,
        duration: 0.6 + Math.random() * 0.4,
        ease: 'power2.out',
        onComplete: () => {
          if (i === 29) {
            container.remove();
          }
        }
      });
    }

    return container;
  };

  const createShockwave = (x, y) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'fixed';
    svg.style.inset = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '9999';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '0');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#9E3028');
    circle.setAttribute('stroke-width', '3');

    svg.appendChild(circle);
    document.body.appendChild(svg);

    gsap.to(circle, {
      attr: { r: 500 },
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => svg.remove()
    });
  };

  return (
    <button
      ref={buttonRef}
      className={`portal-button ${className}`}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      <div ref={glowRef} className="portal-glow" />
      <div ref={particleContainerRef} className="portal-particles">
        {particles.map(p => (
          <div key={p.id} className="portal-particle" />
        ))}
      </div>
      <span className="portal-content">{children}</span>
    </button>
  );
}
