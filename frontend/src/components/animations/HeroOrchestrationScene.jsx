import React, { useEffect, useMemo, useRef, useState } from 'react';
import ThreeDLogoMark from '../common/ThreeDLogoMark';

const VIEWBOX_WIDTH = 1440;
const VIEWBOX_HEIGHT = 900;
const HUB_CENTER = { x: 720, y: 404 };

const HERO_NODES = [
  {
    id: 'registry',
    buttonX: 72,
    buttonY: 150,
    branchX: 324,
    branchY: 170,
    laneY: 334,
    bend: 124,
    label: 'Central Registry',
    meta: 'Schema-first skill records',
    kind: 'foundation',
    side: 'left',
    accent: '#00d4aa',
    explanation: 'Flowfex maintains a unified registry where all skills are stored with structured schemas, making them discoverable and version-controlled.',
  },
  {
    id: 'importer',
    buttonX: 46,
    buttonY: 332,
    branchX: 296,
    branchY: 372,
    laneY: 404,
    bend: 92,
    label: 'Bulk Importer',
    meta: 'Auto-parse markdown skills at scale',
    kind: 'foundation',
    side: 'left',
    accent: '#00e5c3',
    explanation: 'Import hundreds of markdown-based skills at once. Flowfex automatically parses and structures them for immediate use.',
  },
  {
    id: 'category',
    buttonX: 82,
    buttonY: 532,
    branchX: 336,
    branchY: 560,
    laneY: 484,
    bend: 110,
    label: 'Category System',
    meta: 'Counts, filters, grouped lanes',
    kind: 'foundation',
    side: 'left',
    accent: '#7ffff0',
    explanation: 'Organize skills into categories with smart filtering and grouping, making it easy to navigate large skill libraries.',
  },
  {
    id: 'semantic',
    buttonX: 1118,
    buttonY: 150,
    branchX: 1110,
    branchY: 170,
    laneY: 334,
    bend: -124,
    label: 'Semantic Search',
    meta: 'Embeddings and similarity ranking',
    kind: 'intelligence',
    side: 'right',
    accent: '#7ffff0',
    explanation: 'Flowfex uses AI embeddings to match tasks with the most relevant skills based on meaning, not just keywords.',
  },
  {
    id: 'selection',
    buttonX: 1146,
    buttonY: 332,
    branchX: 1138,
    branchY: 372,
    laneY: 404,
    bend: -92,
    label: 'Ranked Selection',
    meta: 'Constraints, trust, approvals',
    kind: 'intelligence',
    side: 'right',
    accent: '#46bda9',
    explanation: 'Skills are ranked by relevance and filtered by trust levels, with human approval gates for critical decisions.',
  },
  {
    id: 'transparency',
    buttonX: 1110,
    buttonY: 532,
    branchX: 1102,
    branchY: 560,
    laneY: 484,
    bend: -110,
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
    x: node.side === 'left' ? HUB_CENTER.x - 142 : HUB_CENTER.x + 142,
    y: node.laneY,
  };
  const to = {
    x: node.branchX,
    y: node.branchY,
  };

  return pathFromTo(from, to, node.bend);
}

function getNodePositionStyle(node, index) {
  const positionStyle = {
    '--node-accent': node.accent,
    '--hero-node-delay': `${0.18 + index * 0.08}s`,
    '--hero-node-enter-x': node.side === 'left' ? '-40px' : '40px',
    top: `${(node.buttonY / VIEWBOX_HEIGHT) * 100}%`,
  };

  if (node.side === 'left') {
    positionStyle.left = `${(node.buttonX / VIEWBOX_WIDTH) * 100}%`;
  } else {
    positionStyle.right = `${((VIEWBOX_WIDTH - node.buttonX) / VIEWBOX_WIDTH) * 100}%`;
  }

  return positionStyle;
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
  const activeNode = useMemo(
    () => HERO_NODES.find((node) => node.id === expandedNode) || null,
    [expandedNode]
  );

  const handleNodeToggle = (nodeId) => {
    setExpandedNode((current) => (current === nodeId ? null : nodeId));
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setExpandedNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={sceneRef} className="hero-orchestration-scene" aria-label="Flowfex orchestration overview">
      <div className="hero-orchestration-mesh hero-orchestration-mesh-primary" />
      <div className="hero-orchestration-mesh hero-orchestration-mesh-secondary" />
      <div className="hero-orchestration-grid" />
      <div className="hero-orchestration-vignette" />

      <svg
        className="hero-orchestration-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="hero-orchestration-parallax hero-orchestration-parallax-near">
          {links.map((node, index) => (
            <g key={`${node.id}-link`} style={{ '--line-accent': node.accent, '--branch-delay': `${0.06 + index * 0.06}s` }}>
              <path
                className="hero-orchestration-link"
                d={node.path}
                pathLength="1"
              />
              <circle className="hero-orchestration-link-terminal" cx={node.branchX} cy={node.branchY} r="7" />
            </g>
          ))}
        </g>
      </svg>

      <div className="hero-orchestration-labels" aria-label="Flowfex orchestration layers">
        {HERO_NODES.map((node, index) => (
          <button
            key={node.id}
            type="button"
            className={`hero-orchestration-node hero-orchestration-node-button hero-orchestration-node-${node.kind}${expandedNode === node.id ? ' is-expanded is-active' : ''}`}
            style={getNodePositionStyle(node, index)}
            aria-label={`${expandedNode === node.id ? 'Hide' : 'Show'} Flowfex details for ${node.label}`}
            aria-pressed={expandedNode === node.id}
            onClick={() => handleNodeToggle(node.id)}
          >
            <span className="hero-orchestration-node-marker" aria-hidden="true">
              <span className="hero-orchestration-node-marker-core" />
            </span>
            <span className="hero-orchestration-node-copy">
              <strong>{node.label}</strong>
              <small>{node.meta}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="hero-orchestration-core">
        <div className="hero-orchestration-core-border">
          <div className="hero-orchestration-core-ring hero-orchestration-core-ring-outer" />
          <div className="hero-orchestration-core-ring hero-orchestration-core-ring-inner" />
        </div>
        <div className="hero-orchestration-core-shell" />
        <div className="hero-orchestration-core-caption">
          <span>Flowfex Orchestrator</span>
          <strong>Import. Rank. Route. Explain.</strong>
        </div>
        <ThreeDLogoMark className="hero-orchestration-logo-mark" depth={14} glow="soft" />
      </div>

      <aside
        className={`hero-orchestration-inspector${activeNode ? ' is-visible' : ''}`}
        aria-live="polite"
      >
        <div className="hero-orchestration-inspector-header">
          <span className="hero-orchestration-inspector-kicker">Selected layer</span>
          <button
            type="button"
            className="hero-orchestration-inspector-close"
            onClick={() => setExpandedNode(null)}
            aria-label="Close selected layer details"
          >
            x
          </button>
        </div>
        <strong>{activeNode?.label || 'Click a skill layer'}</strong>
        <span className="hero-orchestration-inspector-meta">
          {activeNode?.meta || 'Inspect how Flowfex imports, ranks, routes, and explains resources for connected agents.'}
        </span>
        <p>
          {activeNode?.explanation || 'The orchestration layer keeps agent resources visible and reviewable instead of hiding decisions inside one-off prompts.'}
        </p>
      </aside>
    </div>
  );
}
