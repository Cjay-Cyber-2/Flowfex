import React, { useEffect, useRef } from 'react';
import './LiveCanvasBackground.css';

function LiveCanvasBackground() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Node and edge data
    const nodes = [
      { x: 0.2, y: 0.3, radius: 16, state: 'idle', phase: 0 },
      { x: 0.35, y: 0.25, radius: 14, state: 'active', phase: Math.PI / 3 },
      { x: 0.5, y: 0.4, radius: 18, state: 'active', phase: Math.PI / 2 },
      { x: 0.65, y: 0.35, radius: 15, state: 'completed', phase: Math.PI },
      { x: 0.4, y: 0.55, radius: 16, state: 'idle', phase: Math.PI * 1.5 },
      { x: 0.6, y: 0.6, radius: 14, state: 'active', phase: Math.PI * 0.7 },
      { x: 0.75, y: 0.5, radius: 17, state: 'idle', phase: Math.PI * 1.2 },
      { x: 0.3, y: 0.7, radius: 15, state: 'completed', phase: Math.PI * 0.4 }
    ];

    const edges = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 5 },
      { from: 0, to: 4 },
      { from: 4, to: 5 },
      { from: 5, to: 6 },
      { from: 4, to: 7 }
    ];

    // Particles for flow animation
    const particles = [];
    edges.forEach((edge, i) => {
      for (let j = 0; j < 3; j++) {
        particles.push({
          edge: i,
          progress: (j / 3) + Math.random() * 0.1,
          speed: 0.002 + Math.random() * 0.001,
          opacity: 0.6 + Math.random() * 0.4
        });
      }
    });

    // Colors
    const colors = {
      idle: 'rgba(138, 150, 163, 0.58)',
      active: '#00D4AA',
      completed: '#46BDA9',
      particle: '#7FFFF0',
      edge: 'rgba(0, 212, 170, 0.22)'
    };

    let time = 0;

    // Animation loop
    const animate = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      
      // Clear with fade effect
      ctx.fillStyle = 'rgba(8, 12, 16, 0.1)';
      ctx.fillRect(0, 0, w, h);

      time += 0.016;

      // Draw edges
      ctx.strokeStyle = colors.edge;
      ctx.lineWidth = 1.5;
      edges.forEach(edge => {
        const from = nodes[edge.from];
        const to = nodes[edge.to];
        const fx = from.x * w;
        const fy = from.y * h;
        const tx = to.x * w;
        const ty = to.y * h;
        
        // Bezier curve
        const cx = (fx + tx) / 2;
        const cy = (fy + ty) / 2 - 30;
        
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(cx, cy, tx, ty);
        ctx.stroke();
      });

      // Draw and update particles
      particles.forEach(particle => {
        particle.progress += particle.speed;
        if (particle.progress > 1) particle.progress = 0;

        const edge = edges[particle.edge];
        const from = nodes[edge.from];
        const to = nodes[edge.to];
        const fx = from.x * w;
        const fy = from.y * h;
        const tx = to.x * w;
        const ty = to.y * h;
        const cx = (fx + tx) / 2;
        const cy = (fy + ty) / 2 - 30;

        // Calculate position on bezier curve
        const t = particle.progress;
        const x = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * cx + t * t * tx;
        const y = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * cy + t * t * ty;

        // Draw particle
        ctx.fillStyle = colors.particle;
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 1.5, Math.atan2(ty - fy, tx - fx), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw nodes
      nodes.forEach((node, i) => {
        const x = node.x * w;
        const y = node.y * h;
        
        // Idle drift
        const driftX = Math.sin(time * 0.5 + node.phase) * 3;
        const driftY = Math.cos(time * 0.7 + node.phase) * 3;
        const nx = x + driftX;
        const ny = y + driftY;

        // Glow for active nodes
        if (node.state === 'active') {
          const glowSize = 6 + Math.sin(time * 2 + node.phase) * 4;
          const gradient = ctx.createRadialGradient(nx, ny, node.radius, nx, ny, node.radius + glowSize);
          gradient.addColorStop(0, 'rgba(0, 212, 170, 0)');
          gradient.addColorStop(1, 'rgba(0, 212, 170, 0.28)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(nx, ny, node.radius + glowSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node body
        ctx.fillStyle = '#0D1117';
        ctx.strokeStyle = colors[node.state];
        ctx.lineWidth = node.state === 'active' ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Orbital rings for active nodes
        if (node.state === 'active') {
          ctx.strokeStyle = 'rgba(0, 212, 170, 0.3)';
          ctx.lineWidth = 2;
          const ring1 = node.radius * 1.5;
          const ring2 = node.radius * 1.8;
          const rotation1 = time * 0.5;
          const rotation2 = -time * 0.3;
          
          // Ring 1
          ctx.beginPath();
          ctx.arc(nx, ny, ring1, rotation1, rotation1 + Math.PI * 0.6);
          ctx.stroke();
          
          // Ring 2
          ctx.beginPath();
          ctx.arc(nx, ny, ring2, rotation2, rotation2 + Math.PI * 0.5);
          ctx.stroke();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="live-canvas-background"
      aria-hidden="true"
    />
  );
}

export default LiveCanvasBackground;
