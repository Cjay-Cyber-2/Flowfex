import React, { useEffect, useRef } from 'react';

const SYNIQ_COLORS = [
  { r: 0, g: 212, b: 170 },
  { r: 0, g: 229, b: 195 },
  { r: 127, g: 255, b: 240 },
  { r: 70, g: 189, b: 169 },
  { r: 0, g: 180, b: 150 },
];

/** Cap HiDPI cost — text stays readable on large logical canvas pixels. */
const DEVICE_PIXEL_RATIO_CAP = 1.25;
/** Minimum time each word stays on screen so particles can settle into readable text. */
const WORD_CYCLE_MS = 4800;

const PARTICLE_SIDE = 2.65;

class Particle {
  constructor(width, height) {
    const spawn = generateRandomPos(width, height);
    this.pos = { x: spawn.x, y: spawn.y };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: spawn.x, y: spawn.y };
    this.closeEnoughTarget = 104;
    this.maxSpeed = Math.random() * 2.9 + 5.45;
    this.maxForce = 0.26;
    this.isKilled = false;
    this.startColor = { r: 0, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.colorBlendRate = Math.random() * 0.025 + 0.02;
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
    // Higher damping = less oscillation when settling (reads smoother without extra frames cost)
    this.vel.x *= 0.977;
    this.vel.y *= 0.977;

    // Color blend once per physics tick (drawing pass stays cheap batches only)
    if (this.colorWeight < 1) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
    }
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  /** Packed RGB for batching rects with one fill operation per hue. */
  rgbPackedKey() {
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight);
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight);
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight);
    return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
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
  // Step up slightly vs single-pixel-ish sampling → fewer sprites, smoother frame budget at large widths
  const sampleStep = Math.max(6, Math.floor(offscreen.width / 150));

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

export function ParticleTextEffect({ words = ['907 Skills', '423 Agents', '64 Multi-Agents'] }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const wordIndexRef = useRef(0);
  const colorIndexRef = useRef(0);
  const nextSwitchAtRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  /** Keep simulation advancing off-screen — only skip expensive clears / fills while hidden. */
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d', { alpha: true, desynchronized: true })
      ?? canvas.getContext('2d');
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

    const half = PARTICLE_SIDE / 2;

    function animate(now) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const particles = particlesRef.current;

      for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
        particles[particleIndex].move();
      }

      let writeIndex = 0;
      for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
        const particle = particles[particleIndex];
        const outBounds =
          particle.isKilled
          && (
            particle.pos.x < -48
            || particle.pos.x > width + 48
            || particle.pos.y < -48
            || particle.pos.y > height + 48
          );

        if (outBounds) {
          continue;
        }

        particles[writeIndex] = particle;
        writeIndex += 1;
      }

      particles.length = writeIndex;

      if (visibleRef.current && width > 0 && height > 0) {
        context.clearRect(0, 0, width, height);
        /** @type Map<number, number[]> key = rgb packed coords flat [x,y,...] */
        const buckets = new Map();

        for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
          const particle = particles[particleIndex];
          const packed = particle.rgbPackedKey();
          let list = buckets.get(packed);
          if (!list) {
            list = [];
            buckets.set(packed, list);
          }

          list.push(particle.pos.x, particle.pos.y);
        }

        for (const [packed, pts] of buckets.entries()) {
          const r = (packed >>> 16) & 255;
          const g = (packed >>> 8) & 255;
          const b = packed & 255;
          context.fillStyle = `rgb(${r},${g},${b})`;
          context.beginPath();

          for (let i = 0; i < pts.length; i += 2) {
            context.rect(pts[i] - half, pts[i + 1] - half, PARTICLE_SIDE, PARTICLE_SIDE);
          }

          context.fill();
        }
      }

      if (now >= nextSwitchAtRef.current) {
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
        morphToWord(words[wordIndexRef.current]);
        nextSwitchAtRef.current = now + WORD_CYCLE_MS;
      }

      animationRef.current = window.requestAnimationFrame(animate);
    }

    const bootAnimation = () => {
      if (cancelled) {
        return;
      }

      resizeCanvas();
      wordIndexRef.current = 0;
      colorIndexRef.current = 0;
      particlesRef.current = [];
      morphToWord(words[0]);
      nextSwitchAtRef.current = performance.now() + WORD_CYCLE_MS;

      if (!animationRef.current) {
        animationRef.current = window.requestAnimationFrame(animate);
      }
    };

    bootAnimation();

    if (typeof document !== 'undefined' && document.fonts?.load) {
      document.fonts.load('700 1em "Space Grotesk"').then(() => {
        if (!cancelled) {
          morphToWord(words[wordIndexRef.current] || words[0]);
        }
      }).catch(() => {
        return;
      });
    }

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

    /** Pause painting off-screen cheaply while keeping RAF + morph timing alive */
    let visibilityObserver = null;
    if (typeof IntersectionObserver !== 'undefined') {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          const hit = entries[0];
          visibleRef.current = hit ? hit.isIntersecting || hit.intersectionRatio > 0 : true;
        },
        { root: null, rootMargin: '80px', threshold: 0.04 },
      );
      visibilityObserver.observe(canvas);
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

      if (visibilityObserver) {
        visibilityObserver.disconnect();
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
