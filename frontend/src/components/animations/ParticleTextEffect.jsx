/**
 * ParticleTextEffect — canvas-based particle text animation.
 * Renders animated particle text with transparent background,
 * using Flowfex theme colors (teal/cyan palette).
 */
import React, { useRef, useEffect } from 'react';

class Particle {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.closeEnoughTarget = 150;
    this.maxSpeed = 1.0;
    this.maxForce = 0.1;
    this.particleSize = 10;
    this.isKilled = false;
    this.startColor = { r: 0, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.colorBlendRate = 0.02;
  }

  move() {
    let proximityMult = 1;
    const distance = Math.sqrt(
      Math.pow(this.pos.x - this.target.x, 2) +
      Math.pow(this.pos.y - this.target.y, 2)
    );
    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget;
    }
    const towardsTarget = { x: this.target.x - this.pos.x, y: this.target.y - this.pos.y };
    const magnitude = Math.sqrt(towardsTarget.x ** 2 + towardsTarget.y ** 2);
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult;
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult;
    }
    const steer = { x: towardsTarget.x - this.vel.x, y: towardsTarget.y - this.vel.y };
    const sm = Math.sqrt(steer.x ** 2 + steer.y ** 2);
    if (sm > 0) {
      steer.x = (steer.x / sm) * this.maxForce;
      steer.y = (steer.y / sm) * this.maxForce;
    }
    this.acc.x += steer.x;
    this.acc.y += steer.y;
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw(ctx, drawAsPoints) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0);
    }
    const c = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    };
    if (drawAsPoints) {
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    } else {
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  kill(width, height) {
    if (!this.isKilled) {
      const rp = generateRandomPos(width / 2, height / 2, (width + height) / 2);
      this.target.x = rp.x;
      this.target.y = rp.y;
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      };
      this.targetColor = { r: 0, g: 0, b: 0 };
      this.colorWeight = 0;
      this.isKilled = true;
    }
  }
}

function generateRandomPos(x, y, mag) {
  const rx = Math.random() * 1000;
  const ry = Math.random() * 500;
  const dir = { x: rx - x, y: ry - y };
  const m = Math.sqrt(dir.x ** 2 + dir.y ** 2);
  if (m > 0) { dir.x = (dir.x / m) * mag; dir.y = (dir.y / m) * mag; }
  return { x: x + dir.x, y: y + dir.y };
}

/** Flowfex theme color palette for particle rendering */
const FLOWFEX_COLORS = [
  { r: 0, g: 212, b: 170 },    // --color-sinoper #00d4aa
  { r: 0, g: 229, b: 195 },    // #00e5c3
  { r: 127, g: 255, b: 240 },  // #7ffff0
  { r: 70, g: 189, b: 169 },   // #46bda9
  { r: 0, g: 180, b: 150 },    // darker teal
];

export function ParticleTextEffect({ words = ['309 Skills', '64 Agents', '45 Multi-Agents'] }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const frameCountRef = useRef(0);
  const wordIndexRef = useRef(0);
  const colorIndexRef = useRef(0);
  const pixelSteps = 6;
  const drawAsPoints = true;

  function nextWord(word, canvas) {
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext('2d');
    octx.fillStyle = 'white';
    const fontSize = Math.min(120, canvas.width * 0.12);
    octx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(word, canvas.width / 2, canvas.height / 2);

    const imageData = octx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Cycle through Flowfex theme colors
    const baseColor = FLOWFEX_COLORS[colorIndexRef.current % FLOWFEX_COLORS.length];
    colorIndexRef.current++;
    const newColor = {
      r: Math.max(0, Math.min(255, baseColor.r + Math.floor(Math.random() * 30 - 15))),
      g: Math.max(0, Math.min(255, baseColor.g + Math.floor(Math.random() * 30 - 15))),
      b: Math.max(0, Math.min(255, baseColor.b + Math.floor(Math.random() * 30 - 15))),
    };

    const particles = particlesRef.current;
    let particleIndex = 0;
    const dynamicPixelSteps = Math.max(12, Math.floor(canvas.width / 80));
    const coordIndexes = [];
    for (let i = 0; i < pixels.length; i += dynamicPixelSteps * 4) coordIndexes.push(i);
    for (let i = coordIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coordIndexes[i], coordIndexes[j]] = [coordIndexes[j], coordIndexes[i]];
    }

    for (const ci of coordIndexes) {
      if (pixels[ci + 3] > 0) {
        const x = (ci / 4) % canvas.width;
        const y = Math.floor(ci / 4 / canvas.width);
        let p;
        if (particleIndex < particles.length) {
          p = particles[particleIndex];
          p.isKilled = false;
          particleIndex++;
        } else {
          p = new Particle();
          const rp = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2);
          p.pos.x = rp.x; p.pos.y = rp.y;
          p.maxSpeed = Math.random() * 8 + 6;
          p.maxForce = p.maxSpeed * 0.08;
          p.particleSize = Math.random() * 5 + 5;
          p.colorBlendRate = Math.random() * 0.035 + 0.005;
          particles.push(p);
        }
        p.startColor = {
          r: p.startColor.r + (p.targetColor.r - p.startColor.r) * p.colorWeight,
          g: p.startColor.g + (p.targetColor.g - p.startColor.g) * p.colorWeight,
          b: p.startColor.b + (p.targetColor.b - p.startColor.b) * p.colorWeight,
        };
        p.targetColor = newColor;
        p.colorWeight = 0;
        p.target.x = x; p.target.y = y;
      }
    }
    for (let i = particleIndex; i < particles.length; i++) {
      particles[i].kill(canvas.width, canvas.height);
    }
  }

  function animate(canvas) {
    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;
    // Transparent background — clear fully then draw with slight fade
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].move();
      particles[i].draw(ctx, drawAsPoints);
      if (particles[i].isKilled && (
        particles[i].pos.x < 0 || particles[i].pos.x > canvas.width ||
        particles[i].pos.y < 0 || particles[i].pos.y > canvas.height
      )) {
        particles.splice(i, 1);
      }
    }

    frameCountRef.current++;
    if (frameCountRef.current % 150 === 0) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
      nextWord(words[wordIndexRef.current], canvas);
    }
    animRef.current = requestAnimationFrame(() => animate(canvas));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      const w = container ? container.clientWidth : 800;
      canvas.width = Math.min(w, 1000);
      canvas.height = Math.round(canvas.width * 0.4);
    };
    resize();
    window.addEventListener('resize', resize);

    nextWord(words[0], canvas);
    animate(canvas);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
    // Legacy standalone effect: animation owns its frame loop and is reset only when words change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        borderRadius: '1rem',
        background: 'transparent',
      }}
    />
  );
}

export default ParticleTextEffect;
