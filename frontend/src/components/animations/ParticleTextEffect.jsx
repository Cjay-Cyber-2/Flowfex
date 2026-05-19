import React, { useEffect, useRef } from 'react';

const SYNIQ_COLORS = [
  { r: 0, g: 212, b: 170 },
  { r: 0, g: 229, b: 195 },
  { r: 127, g: 255, b: 240 },
  { r: 70, g: 189, b: 169 },
  { r: 0, g: 180, b: 150 },
];

const DEVICE_PIXEL_RATIO_CAP = 1.5;
/** Minimum time each word stays on screen so particles can settle into readable text. */
const WORD_CYCLE_MS = 5200;

class Particle {
  constructor(width, height) {
    const spawn = generateRandomPos(width, height);
    this.pos = { x: spawn.x, y: spawn.y };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: spawn.x, y: spawn.y };
    this.closeEnoughTarget = 112;
    this.maxSpeed = Math.random() * 3 + 4.4;
    this.maxForce = 0.14;
    this.isKilled = false;
    this.startColor = { r: 0, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.colorBlendRate = Math.random() * 0.03 + 0.015;
  }

  move() {
    let proximityMult = 1;
    const distance = Math.hypot(this.pos.x - this.target.x, this.pos.y - this.target.y);
    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget;
    }

    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    };
    const magnitude = Math.hypot(towardsTarget.x, towardsTarget.y);
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult;
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult;
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    };
    const steerMagnitude = Math.hypot(steer.x, steer.y);
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce;
      steer.y = (steer.y / steerMagnitude) * this.maxForce;
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

  draw(ctx) {
    if (this.colorWeight < 1) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
    }

    const color = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    };

    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.fillRect(this.pos.x, this.pos.y, 2.5, 2.5);
  }

  retarget(nextTarget, nextColor) {
    this.isKilled = false;
    this.startColor = {
      r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
      g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
      b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
    };
    this.targetColor = nextColor;
    this.colorWeight = 0;
    this.target.x = nextTarget.x;
    this.target.y = nextTarget.y;
  }

  kill(width, height) {
    if (this.isKilled) {
      return;
    }

    const exitTarget = generateRandomPos(width, height, 0.72);
    this.retarget(exitTarget, { r: 0, g: 0, b: 0 });
    this.isKilled = true;
  }
}

function generateRandomPos(width, height, radiusScale = 1) {
  const originX = width / 2;
  const originY = height / 2;
  const angle = Math.random() * Math.PI * 2;
  const radius = (Math.max(width, height) * 0.55 * radiusScale) + Math.random() * 36;

  return {
    x: originX + Math.cos(angle) * radius,
    y: originY + Math.sin(angle) * radius,
  };
}

function pickWordColor(index) {
  const baseColor = SYNIQ_COLORS[index % SYNIQ_COLORS.length];
  return {
    r: Math.max(0, Math.min(255, baseColor.r + Math.floor(Math.random() * 26 - 13))),
    g: Math.max(0, Math.min(255, baseColor.g + Math.floor(Math.random() * 26 - 13))),
    b: Math.max(0, Math.min(255, baseColor.b + Math.floor(Math.random() * 26 - 13))),
  };
}

function createWordTargets(word, width, height) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offscreenContext = offscreen.getContext('2d');
  offscreenContext.clearRect(0, 0, offscreen.width, offscreen.height);
  offscreenContext.fillStyle = 'white';
  const fontSize = Math.min(132, offscreen.width * 0.118);
  offscreenContext.font = `700 ${fontSize}px "Space Grotesk", Inter, Arial, sans-serif`;
  offscreenContext.textAlign = 'center';
  offscreenContext.textBaseline = 'middle';
  offscreenContext.fillText(word, offscreen.width / 2, offscreen.height / 2);

  const pixels = offscreenContext.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const targets = [];
  // Smaller sample step gives denser, more legible text — matches the
  // original Syniq animation density (every ~6 px) instead of the sparse
  // step the section had drifted to.
  const sampleStep = Math.max(5, Math.floor(offscreen.width / 200));

  for (let y = 0; y < offscreen.height; y += sampleStep) {
    for (let x = 0; x < offscreen.width; x += sampleStep) {
      const pixelIndex = (y * offscreen.width + x) * 4;
      if (pixels[pixelIndex + 3] > 0) {
        targets.push({ x, y });
      }
    }
  }

  // Shuffle so the morph fills the word organically instead of row by row.
  for (let i = targets.length - 1; i > 0; i -= 1) {
    const swap = Math.floor(Math.random() * (i + 1));
    const tmp = targets[i];
    targets[i] = targets[swap];
    targets[swap] = tmp;
  }

  return targets;
}

export function ParticleTextEffect({ words = ['853 Skills', '420 Agents', '64 Multi-Agents'] }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const wordIndexRef = useRef(0);
  const colorIndexRef = useRef(0);
  const nextSwitchAtRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }
    let cancelled = false;

    function resizeCanvas() {
      const container = canvas.parentElement;
      const measured = container ? container.clientWidth : 0;
      // Layout can momentarily report 0 (e.g. before fonts settle or while a
      // hidden ancestor is hydrating). Fall back to a reasonable minimum so
      // the particles never render against a zero-sized canvas.
      const width = Math.max(320, Math.min(measured || 960, 1040));
      const height = Math.max(160, Math.round(width * 0.34));
      const dpr = Math.min(window.devicePixelRatio || 1, DEVICE_PIXEL_RATIO_CAP);
      const previous = canvasSizeRef.current;

      if (previous.width === width && previous.height === height) {
        return false;
      }

      canvasSizeRef.current = { width, height };

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      return true;
    }

    function morphToWord(word) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const targets = createWordTargets(word, width, height);
      const nextColor = pickWordColor(colorIndexRef.current);
      colorIndexRef.current += 1;

      const particles = particlesRef.current;
      let index = 0;
      for (const target of targets) {
        let particle = particles[index];
        if (!particle) {
          particle = new Particle(width, height);
          particles.push(particle);
        }

        particle.retarget(target, nextColor);
        index += 1;
      }

      for (let particleIndex = index; particleIndex < particles.length; particleIndex += 1) {
        particles[particleIndex].kill(width, height);
      }
    }

    function animate(now) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      for (let particleIndex = particles.length - 1; particleIndex >= 0; particleIndex -= 1) {
        const particle = particles[particleIndex];
        particle.move();
        particle.draw(context);

        if (
          particle.isKilled
          && (
            particle.pos.x < -24
            || particle.pos.x > width + 24
            || particle.pos.y < -24
            || particle.pos.y > height + 24
          )
        ) {
          particles.splice(particleIndex, 1);
        }
      }

      if (now >= nextSwitchAtRef.current) {
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
        morphToWord(words[wordIndexRef.current]);
        nextSwitchAtRef.current = now + WORD_CYCLE_MS;
      }

      animationRef.current = window.requestAnimationFrame(animate);
    }

    const startAnimation = async () => {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // Ignore font readiness failures and continue with the fallback stack.
        }
      }

      if (cancelled) {
        return;
      }

      resizeCanvas();
      wordIndexRef.current = 0;
      colorIndexRef.current = 0;
      particlesRef.current = [];
      morphToWord(words[0]);
      nextSwitchAtRef.current = performance.now() + WORD_CYCLE_MS;
      animationRef.current = window.requestAnimationFrame(animate);
    };

    startAnimation();

    const handleResize = () => {
      const resized = resizeCanvas();
      if (!resized) {
        return;
      }
      particlesRef.current = [];
      morphToWord(words[wordIndexRef.current] || words[0]);
    };

    window.addEventListener('resize', handleResize);

    // ResizeObserver catches container width changes that the window
    // resize event misses (e.g. flex/grid reflow after fonts settle).
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      cancelled = true;
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [words]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        maxWidth: '1040px',
        borderRadius: '1rem',
        background: 'transparent',
      }}
    />
  );
}

export default ParticleTextEffect;
