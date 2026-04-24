/**
 * ParticleTextEffect — canvas-based particle text animation.
 * Uses transparent canvas with Flowfex brand colors.
 * No black background — blends naturally into any section.
 */
import React, { useRef, useEffect } from 'react';

// ─── Flowfex brand palette for particles ────────────────────────────────
const BRAND_COLORS = [
  { r: 0, g: 212, b: 170 },    // #00D4AA — primary green
  { r: 127, g: 255, b: 240 },  // #7FFFF0 — bright teal
  { r: 70, g: 189, b: 169 },   // #46BDA9 — muted teal
  { r: 0, g: 229, b: 195 },    // #00E5C3 — saturated teal
];

class Particle {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.closeEnoughTarget = 100;
    this.maxSpeed = 1.0;
    this.maxForce = 0.1;
    this.particleSize = 10;
    this.isKilled = false;
    this.startColor = { r: 0, g: 212, b: 170 };
    this.targetColor = { r: 0, g: 212, b: 170 };
    this.colorWeight = 0;
    this.colorBlendRate = 0.01;
    this.alpha = 1;
  }

  move() {
    let proximityMult = 1;
    const distance = Math.sqrt(
      (this.pos.x - this.target.x) ** 2 +
      (this.pos.y - this.target.y) ** 2
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
    // Fade killed particles out
    const alpha = this.isKilled ? Math.max(0, this.alpha - 0.02) : 1;
    this.alpha = alpha;

    if (drawAsPoints) {
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
    } else {
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
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
      // Blend towards transparent instead of black
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      };
      // Keep the same color but fade alpha
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

function pickBrandColor() {
  return { ...BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)] };
}

export function ParticleTextEffect({
  words = ['Flowfex', 'Connect', 'Orchestrate', 'Guide', 'Automate'],
  intervalMs = 4000,
  fontScale = 0.15,
  maxFontSize = 156,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const wordIndexRef = useRef(0);
  const pixelSteps = 6;
  const drawAsPoints = true;
  const safeWords = Array.isArray(words) && words.length > 0 ? words : ['Flowfex'];

  function nextWord(word, canvas) {
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext('2d');
    octx.fillStyle = 'white';
    const fontSize = Math.min(maxFontSize, canvas.width * fontScale);
    octx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(word, canvas.width / 2, canvas.height / 2);

    const imageData = octx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Pick a brand color for this word cycle
    const newColor = pickBrandColor();

    const particles = particlesRef.current;
    let particleIndex = 0;
    const coordIndexes = [];
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) coordIndexes.push(i);
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
          p.alpha = 1;
          particleIndex++;
        } else {
          p = new Particle();
          const rp = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2);
          p.pos.x = rp.x; p.pos.y = rp.y;
          p.maxSpeed = Math.random() * 6 + 4;
          p.maxForce = p.maxSpeed * 0.05;
          p.particleSize = Math.random() * 6 + 6;
          p.colorBlendRate = Math.random() * 0.0275 + 0.0025;
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

  function animate(canvas, timestamp) {
    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;

    // TRANSPARENT clear — no black background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].move();
      particles[i].draw(ctx, drawAsPoints);
      if (particles[i].isKilled && (
        particles[i].alpha <= 0.02 ||
        particles[i].pos.x < -50 || particles[i].pos.x > canvas.width + 50 ||
        particles[i].pos.y < -50 || particles[i].pos.y > canvas.height + 50
      )) {
        particles.splice(i, 1);
      }
    }

    if (!animate.lastSwapAt) {
      animate.lastSwapAt = timestamp;
    }

    if (timestamp - animate.lastSwapAt >= intervalMs && words.length > 1) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
      nextWord(words[wordIndexRef.current], canvas);
      animate.lastSwapAt = timestamp;
    }
    animRef.current = requestAnimationFrame((nextTimestamp) => animate(canvas, nextTimestamp));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      const w = container ? container.clientWidth : 800;
      canvas.width = Math.min(w, 1100);
      canvas.height = Math.round(canvas.width * 0.56);
    };
    resize();
    window.addEventListener('resize', resize);

    wordIndexRef.current = 0;
    nextWord(safeWords[0], canvas);
    animate.lastSwapAt = 0;
    animRef.current = requestAnimationFrame((timestamp) => animate(canvas, timestamp));

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [safeWords, intervalMs, fontScale, maxFontSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '1rem' }}
    />
  );
}

export default ParticleTextEffect;
