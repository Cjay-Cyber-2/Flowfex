import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PortalButton.css';

const PortalButton = ({ children, onClick, className = '', ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState([]);
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const requestRef = useRef();

  // Particle System Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;
      const speedMult = isHovered ? 3 : 1;

      // Orbital particles
      if (particlesRef.current.length < 20) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: 0,
          size: Math.random() * 2 + 1,
          speed: (Math.random() * 0.02 + 0.01),
          offset: Math.random() * 10,
          color: Math.random() > 0.5 ? '#00D4AA' : '#E8B931'
        });
      }

      particlesRef.current.forEach((p, i) => {
        p.angle += p.speed * speedMult;
        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const w = rect.width / 2 + 10;
        const h = rect.height / 2 + 10;

        const x = centerX + Math.cos(p.angle) * w;
        const y = centerY + Math.sin(p.angle) * h;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestRef.current = requestAnimationFrame(updateParticles);
    };

    const handleResize = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      canvas.width = rect.width + 100;
      canvas.height = rect.height + 100;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    requestRef.current = requestAnimationFrame(updateParticles);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [isHovered]);

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    buttonRef.current.style.setProperty('--mouse-x', `${x}px`);
    buttonRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleClick = (e) => {
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRipples(prev => [...prev, { id: Date.now(), x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.slice(1));
    }, 1000);

    if (onClick) onClick(e);
  };

  return (
    <div className="portal-button-container">
      <canvas ref={canvasRef} className="portal-button-canvas" />
      <motion.button
        ref={buttonRef}
        className={`portal-button ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        {...props}
      >
        <div className="portal-button-glow" />
        <div className="portal-button-noise" />
        <div className="portal-button-content">
          {children}
        </div>
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.span
              key={ripple.id}
              className="portal-button-ripple"
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default PortalButton;
