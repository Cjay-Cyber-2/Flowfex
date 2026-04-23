import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MeshGradient, PulsingBorder } from '@paper-design/shaders-react';
import ThreeDLogoMark from '../common/ThreeDLogoMark';

const HUB_CENTER = { x: 720, y: 450 };
const NODE_WIDTH = 226;
const NODE_HEIGHT = 86;

const HERO_NODES = [
  {
    id: 'registry',
    x: 142,
    y: 182,
    label: 'Central Registry',
    meta: 'Schema-first skill records',
    kind: 'foundation',
    side: 'left',
    accent: '#00d4aa',
    explanation: 'Flowfex maintains a unified registry where all skills are stored with structured schemas, making them discoverable and version-controlled.',
  },
  {
    id: 'importer',
    x: 124,
    y: 370,
    label: 'Bulk Importer',
    meta: 'Auto-parse markdown skills at scale',
    kind: 'foundation',
    side: 'left',
    accent: '#00e5c3',
    explanation: 'Import hundreds of markdown-based skills at once. Flowfex automatically parses and structures them for immediate use.',
  },
  {
    id: 'category',
    x: 156,
    y: 558,
    label: 'Category System',
    meta: 'Counts, filters, grouped lanes',
    kind: 'foundation',
    side: 'left',
    accent: '#7ffff0',
    explanation: 'Organize skills into categories with smart filtering and grouping, making it easy to navigate large skill libraries.',
  },
  {
    id: 'semantic',
    x: 1072,
    y: 182,
    label: 'Semantic Search',
    meta: 'Embeddings and similarity ranking',
    kind: 'intelligence',
    side: 'right',
    accent: '#7ffff0',
    explanation: 'Flowfex uses AI embeddings to match tasks with the most relevant skills based on meaning, not just keywords.',
  },
  {
    id: 'selection',
    x: 1090,
    y: 370,
    label: 'Ranked Selection',
    meta: 'Constraints, trust, approvals',
    kind: 'intelligence',
    side: 'right',
    accent: '#46bda9',
    explanation: 'Skills are ranked by relevance and filtered by trust levels, with human approval gates for critical decisions.',
  },
  {
    id: 'transparency',
    x: 1058,
    y: 558,
    label: 'Decision Transparency',
    meta: 'Why chosen, score, rejected options',
    kind: 'intelligence',
    side: 'right',
    accent: '#00d4aa',
    explanation: 'Every skill selection shows why it was chosen, its confidence score, and what alternatives were considered.',
  },
];

function pathFromTo(from, to, bendAmount) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;

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

function buildNodePath(node) {
  const from = {
    x: node.side === 'left' ? node.x + NODE_WIDTH : node.x,
    y: node.y + NODE_HEIGHT / 2,
  };
  const to = {
    x: node.side === 'left' ? HUB_CENTER.x - 164 : HUB_CENTER.x + 164,
    y: HUB_CENTER.y + (node.y + NODE_HEIGHT / 2 - HUB_CENTER.y) * 0.26,
  };
  const bend = node.side === 'left' ? -82 : 82;
  return pathFromTo(from, to, bend);
}

function HeroNode({ node, isExpanded, onToggle }) {
  return (
    <g
      className={`hero-orchestration-node hero-orchestration-node-${node.kind}`}
      transform={`translate(${node.x} ${node.y})`}
      style={{ '--node-accent': node.accent }}
    >
      <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="26" />
      <rect className="hero-orchestration-node-topline" width={NODE_WIDTH} height="2" rx="2" />
      <g 
        className="hero-orchestration-node-dot-group" 
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
      >
        <circle className="hero-orchestration-node-dot-pulse" cx="28" cy="31" r="10" opacity="0">
          <animate attributeName="r" from="6" to="12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle className="hero-orchestration-node-dot" cx="28" cy="31" r="6" />
      </g>
      <text className="hero-orchestration-node-label" x="46" y="33">
        {node.label}
      </text>
      <text className="hero-orchestration-node-meta" x="46" y="56">
        {node.meta}
      </text>
      {isExpanded && (
        <g className="hero-orchestration-node-explanation">
          <rect 
            x="0" 
            y={NODE_HEIGHT + 8} 
            width={NODE_WIDTH} 
            height="auto" 
            rx="12" 
            fill="rgba(0, 212, 170, 0.1)" 
            stroke={node.accent} 
            strokeWidth="1"
          />
          <foreignObject 
            x="8" 
            y={NODE_HEIGHT + 16} 
            width={NODE_WIDTH - 16} 
            height="120"
          >
            <div style={{
              fontSize: '11px',
              lineHeight: '1.4',
              color: '#7ffff0',
              padding: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {node.explanation}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}

export default function HeroOrchestrationScene() {
  const sceneRef = useRef(null);
  const [expandedNode, setExpandedNode] = useState(null);

  const links = useMemo(
    () =>
      HERO_NODES.map((node) => ({
        ...node,
        path: buildNodePath(node),
      })),
    []
  );

  const handleNodeToggle = (nodeId) => {
    setExpandedNode(expandedNode === nodeId ? null : nodeId);
  };

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
      <div className="hero-orchestration-mesh hero-orchestration-mesh-primary">
        <MeshGradient
          colors={['#05090d', '#0a131a', '#0d1f24', '#00d4aa', '#46bda9', '#7ffff0']}
          speed={0.16}
          distortion={0.72}
          swirl={0.28}
          grainMixer={0.06}
          grainOverlay={0.03}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="hero-orchestration-mesh hero-orchestration-mesh-secondary">
        <MeshGradient
          colors={['#081017', '#101a20', '#00d4aa', '#00e5c3', '#7ffff0']}
          speed={0.1}
          distortion={0.34}
          swirl={0.64}
          grainMixer={0.08}
          grainOverlay={0.06}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <div className="hero-orchestration-vignette" />

      <svg
        className="hero-orchestration-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="hero-center-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(127, 255, 240, 0.22)" />
            <stop offset="52%" stopColor="rgba(0, 212, 170, 0.12)" />
            <stop offset="100%" stopColor="rgba(0, 212, 170, 0)" />
          </radialGradient>
          <filter id="hero-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="20" result="shadow" />
            <feColorMatrix
              in="shadow"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0.34
                      0 0 1 0 0.22
                      0 0 0 12 -5.8"
            />
          </filter>
        </defs>

        <g className="hero-orchestration-parallax hero-orchestration-parallax-near">
          <circle className="hero-orchestration-center-aura" cx={HUB_CENTER.x} cy={HUB_CENTER.y} r="284" />
          {links.map((node) => (
            <path
              key={`${node.id}-link`}
              className="hero-orchestration-link"
              d={node.path}
              style={{ '--line-accent': node.accent }}
            />
          ))}
          {HERO_NODES.map((node) => (
            <HeroNode 
              key={node.id} 
              node={node} 
              isExpanded={expandedNode === node.id}
              onToggle={() => handleNodeToggle(node.id)}
            />
          ))}
        </g>
      </svg>

      <div className="hero-orchestration-core">
        <div className="hero-orchestration-core-border">
          <PulsingBorder
            colors={['#00d4aa', '#00e5c3', '#7ffff0', '#46bda9']}
            colorBack="#00000000"
            speed={1.05}
            roundness={1}
            thickness={0.1}
            softness={0.18}
            intensity={4.2}
            spotsPerColor={4}
            spotSize={0.1}
            pulse={0.08}
            smoke={0.08}
            smokeSize={1.4}
            scale={0.86}
            rotation={0}
            style={{ width: '100%', height: '100%', borderRadius: '50%' }}
          />
        </div>
        <div className="hero-orchestration-core-shell" />
        <div className="hero-orchestration-core-caption">
          <span>Flowfex Orchestrator</span>
          <strong>Import. Rank. Route. Explain.</strong>
        </div>
        <ThreeDLogoMark className="hero-orchestration-logo-mark" depth={14} glow="soft" />
      </div>
    </div>
  );
}
