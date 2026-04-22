import React, { useEffect, useMemo, useRef } from 'react';
import ThreeDLogoMark from '../common/ThreeDLogoMark';

const HUB_CENTER = { x: 720, y: 476 };

const HERO_NODES = [
  {
    id: 'cli',
    x: 178,
    y: 254,
    label: 'CLI Agent',
    meta: 'Command stream',
    kind: 'agent',
  },
  {
    id: 'ide',
    x: 192,
    y: 432,
    label: 'IDE Agent',
    meta: 'Code context',
    kind: 'agent',
  },
  {
    id: 'web',
    x: 170,
    y: 618,
    label: 'Web Agent',
    meta: 'Live interface',
    kind: 'agent',
  },
  {
    id: 'skills',
    x: 1260,
    y: 224,
    label: 'Skill Graph',
    meta: 'Ranked capabilities',
    kind: 'resource',
  },
  {
    id: 'tools',
    x: 1274,
    y: 414,
    label: 'Tool Router',
    meta: 'Safe execution',
    kind: 'resource',
  },
  {
    id: 'memory',
    x: 1244,
    y: 612,
    label: 'Memory Layer',
    meta: 'Persistent context',
    kind: 'resource',
  },
  {
    id: 'approvals',
    x: 720,
    y: 122,
    label: 'Approvals',
    meta: 'Human checkpoints',
    kind: 'control',
  },
  {
    id: 'results',
    x: 720,
    y: 794,
    label: 'Result Channel',
    meta: 'Structured output',
    kind: 'output',
  },
];

const HUB_ANCHORS = {
  cli: { x: 526, y: 332 },
  ide: { x: 492, y: 472 },
  web: { x: 542, y: 626 },
  skills: { x: 916, y: 302 },
  tools: { x: 944, y: 466 },
  memory: { x: 904, y: 640 },
  approvals: { x: 720, y: 266 },
  results: { x: 720, y: 688 },
};

const LANE_CONFIG = [
  { id: 'cli', accent: '#7ffff0', duration: 7.2, delay: 0.0, bend: -118 },
  { id: 'ide', accent: '#00d4aa', duration: 6.4, delay: 1.1, bend: -86 },
  { id: 'web', accent: '#77c3ff', duration: 7.9, delay: 0.7, bend: -126 },
  { id: 'skills', accent: '#00e5c3', duration: 6.1, delay: 0.4, bend: 102 },
  { id: 'tools', accent: '#8ee8ff', duration: 5.8, delay: 1.4, bend: 72 },
  { id: 'memory', accent: '#50d6ba', duration: 6.8, delay: 0.9, bend: 118 },
  { id: 'approvals', accent: '#8fffe1', duration: 5.6, delay: 0.5, bend: 0 },
  { id: 'results', accent: '#b5fff2', duration: 5.9, delay: 1.2, bend: 0 },
];

function pathFromTo(from, to, bendAmount) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const intensity = distance * 0.14;

  const controlOne = {
    x: from.x + dx * 0.32 + normalX * bendAmount,
    y: from.y + dy * 0.18 + normalY * bendAmount,
  };

  const controlTwo = {
    x: from.x + dx * 0.72 + normalX * (bendAmount * 0.56),
    y: from.y + dy * 0.88 + normalY * (bendAmount * 0.56),
  };

  return `M ${from.x} ${from.y} C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${to.x} ${to.y}`;
}

function HeroNode({ node }) {
  return (
    <g className={`hero-orchestration-node hero-orchestration-node-${node.kind}`} transform={`translate(${node.x} ${node.y})`}>
      <rect x="-84" y="-34" width="168" height="68" rx="24" />
      <circle className="hero-orchestration-node-dot" cx="-53" cy="0" r="7" />
      <text className="hero-orchestration-node-label" x="-34" y="-5">
        {node.label}
      </text>
      <text className="hero-orchestration-node-meta" x="-34" y="15">
        {node.meta}
      </text>
    </g>
  );
}

export default function HeroOrchestrationScene() {
  const sceneRef = useRef(null);

  const lanes = useMemo(
    () =>
      LANE_CONFIG.map((lane) => {
        const from = HERO_NODES.find((node) => node.id === lane.id);
        const to = HUB_ANCHORS[lane.id];
        return {
          ...lane,
          path: pathFromTo(from, to, lane.bend),
          packetDelay: lane.delay + lane.duration * 0.5,
        };
      }),
    []
  );

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      scene.style.setProperty('--hero-parallax-x', '0px');
      scene.style.setProperty('--hero-parallax-y', '0px');
      return undefined;
    }

    let rafId = 0;
    let pointerX = 0;
    let pointerY = 0;

    const flushPointer = () => {
      scene.style.setProperty('--hero-parallax-x', `${pointerX.toFixed(1)}px`);
      scene.style.setProperty('--hero-parallax-y', `${pointerY.toFixed(1)}px`);
      rafId = 0;
    };

    const queuePointer = (clientX, clientY) => {
      const rect = scene.getBoundingClientRect();
      const normalizedX = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const normalizedY = ((clientY - rect.top) / rect.height - 0.5) * 2;
      pointerX = normalizedX * 14;
      pointerY = normalizedY * 10;

      if (!rafId) {
        rafId = window.requestAnimationFrame(flushPointer);
      }
    };

    const resetPointer = () => {
      pointerX *= 0.42;
      pointerY *= 0.42;

      if (Math.abs(pointerX) < 0.2 && Math.abs(pointerY) < 0.2) {
        pointerX = 0;
        pointerY = 0;
      }

      if (!rafId) {
        rafId = window.requestAnimationFrame(flushPointer);
      }
    };

    const handlePointerMove = (event) => {
      queuePointer(event.clientX, event.clientY);
    };

    scene.addEventListener('pointermove', handlePointerMove);
    scene.addEventListener('pointerleave', resetPointer);

    return () => {
      scene.removeEventListener('pointermove', handlePointerMove);
      scene.removeEventListener('pointerleave', resetPointer);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div ref={sceneRef} className="hero-orchestration-scene" aria-hidden="true">
      <div className="hero-orchestration-nebula hero-orchestration-nebula-left" />
      <div className="hero-orchestration-nebula hero-orchestration-nebula-right" />
      <div className="hero-orchestration-nebula hero-orchestration-nebula-bottom" />

      <svg
        className="hero-orchestration-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="hero-kernel-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(127, 255, 240, 0.95)" />
            <stop offset="20%" stopColor="rgba(0, 229, 195, 0.45)" />
            <stop offset="55%" stopColor="rgba(0, 212, 170, 0.14)" />
            <stop offset="100%" stopColor="rgba(0, 212, 170, 0)" />
          </radialGradient>
          <linearGradient id="hero-grid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 212, 170, 0.08)" />
            <stop offset="50%" stopColor="rgba(127, 255, 240, 0.02)" />
            <stop offset="100%" stopColor="rgba(0, 212, 170, 0.08)" />
          </linearGradient>
          <filter id="hero-node-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="16" result="glow" />
            <feColorMatrix
              in="glow"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0.4
                      0 0 1 0 0.25
                      0 0 0 12 -4.6"
            />
          </filter>
        </defs>

        <g className="hero-orchestration-parallax hero-orchestration-parallax-far">
          <circle className="hero-orchestration-kernel-aura" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="290" />
          <circle className="hero-orchestration-kernel-aura-secondary" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="420" />
          <g className="hero-orchestration-grid">
            {Array.from({ length: 10 }, (_, index) => (
              <line
                key={`h-${index}`}
                x1="96"
                y1={145 + index * 70}
                x2="1344"
                y2={145 + index * 70}
                stroke="url(#hero-grid-gradient)"
              />
            ))}
            {Array.from({ length: 11 }, (_, index) => (
              <line
                key={`v-${index}`}
                x1={160 + index * 112}
                y1="108"
                x2={160 + index * 112}
                y2="820"
                stroke="url(#hero-grid-gradient)"
              />
            ))}
          </g>
        </g>

        <g className="hero-orchestration-parallax hero-orchestration-parallax-mid">
          {lanes.map((lane) => (
            <g key={lane.id}>
              <path
                className="hero-orchestration-lane hero-orchestration-lane-base"
                d={lane.path}
              />
              <path
                id={`hero-lane-${lane.id}`}
                className="hero-orchestration-lane hero-orchestration-lane-flow"
                d={lane.path}
                pathLength="1"
                style={{
                  '--lane-accent': lane.accent,
                  '--lane-duration': `${lane.duration}s`,
                  '--lane-delay': `-${lane.delay}s`,
                }}
              />
              <circle
                className="hero-orchestration-packet hero-orchestration-packet-primary"
                r="4"
                style={{ '--packet-color': lane.accent }}
              >
                <animateMotion dur={`${lane.duration}s`} repeatCount="indefinite" begin={`${lane.delay}s`}>
                  <mpath href={`#hero-lane-${lane.id}`} />
                </animateMotion>
              </circle>
              <circle
                className="hero-orchestration-packet hero-orchestration-packet-secondary"
                r="3"
                style={{ '--packet-color': lane.accent }}
              >
                <animateMotion dur={`${lane.duration}s`} repeatCount="indefinite" begin={`${lane.packetDelay}s`}>
                  <mpath href={`#hero-lane-${lane.id}`} />
                </animateMotion>
              </circle>
            </g>
          ))}
        </g>

        <g className="hero-orchestration-parallax hero-orchestration-parallax-near">
          <g className="hero-orchestration-hub-rings">
            <circle className="hero-orchestration-orbit hero-orchestration-orbit-outer" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="228" />
            <circle className="hero-orchestration-orbit hero-orchestration-orbit-mid" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="178" />
            <circle className="hero-orchestration-orbit hero-orchestration-orbit-inner" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="132" />
            <circle className="hero-orchestration-wave hero-orchestration-wave-one" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="170" />
            <circle className="hero-orchestration-wave hero-orchestration-wave-two" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="170" />
            <circle className="hero-orchestration-wave hero-orchestration-wave-three" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="170" />
          </g>

          {HERO_NODES.map((node) => (
            <HeroNode key={node.id} node={node} />
          ))}
        </g>
      </svg>

      <div className="hero-orchestration-core">
        <div className="hero-orchestration-core-shell" />
        <div className="hero-orchestration-core-ping hero-orchestration-core-ping-one" />
        <div className="hero-orchestration-core-ping hero-orchestration-core-ping-two" />
        <div className="hero-orchestration-core-ping hero-orchestration-core-ping-three" />
        <ThreeDLogoMark className="hero-orchestration-logo-mark" depth={10} />
      </div>

      <div className="hero-orchestration-film" />
    </div>
  );
}
