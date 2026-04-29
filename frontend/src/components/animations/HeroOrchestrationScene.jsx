import React, { useEffect, useMemo, useRef, useState } from 'react';

const HUB_CENTER = { x: 720, y: 404 };
const NODE_WIDTH = 218;
const NODE_HEIGHT = 82;

const HERO_NODES = [
  {
    id: 'registry',
    x: 186,
    y: 130,
    label: 'Central Registry',
    meta: 'Schema-first skill records',
    kind: 'foundation',
    side: 'left',
    accent: '#00d4aa',
    explanation: 'Flowfex maintains a unified registry where all skills are stored with structured schemas, making them discoverable and version-controlled.',
  },
  {
    id: 'importer',
    x: 164,
    y: 306,
    label: 'Bulk Importer',
    meta: 'Auto-parse markdown skills at scale',
    kind: 'foundation',
    side: 'left',
    accent: '#00e5c3',
    explanation: 'Import hundreds of markdown-based skills at once. Flowfex automatically parses and structures them for immediate use.',
  },
  {
    id: 'category',
    x: 194,
    y: 482,
    label: 'Category System',
    meta: 'Counts, filters, grouped lanes',
    kind: 'foundation',
    side: 'left',
    accent: '#7ffff0',
    explanation: 'Organize skills into categories with smart filtering and grouping, making it easy to navigate large skill libraries.',
  },
  {
    id: 'semantic',
    x: 1036,
    y: 130,
    label: 'Semantic Search',
    meta: 'Embeddings and similarity ranking',
    kind: 'intelligence',
    side: 'right',
    accent: '#7ffff0',
    explanation: 'Flowfex uses AI embeddings to match tasks with the most relevant skills based on meaning, not just keywords.',
  },
  {
    id: 'selection',
    x: 1058,
    y: 306,
    label: 'Ranked Selection',
    meta: 'Constraints, trust, approvals',
    kind: 'intelligence',
    side: 'right',
    accent: '#46bda9',
    explanation: 'Skills are ranked by relevance and filtered by trust levels, with human approval gates for critical decisions.',
  },
  {
    id: 'transparency',
    x: 1028,
    y: 482,
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
  const handleActivate = (event) => {
    event.stopPropagation();
    onToggle();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate(event);
    }
  };

  return (
    <g
      className={`hero-orchestration-node hero-orchestration-node-${node.kind}${isExpanded ? ' is-expanded' : ''}`}
      transform={`translate(${node.x} ${node.y})`}
      style={{ '--node-accent': node.accent }}
      role="button"
      tabIndex={0}
      aria-label={`${isExpanded ? 'Hide' : 'Show'} Flowfex details for ${node.label}`}
      aria-pressed={isExpanded}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx="26" />
      <rect className="hero-orchestration-node-topline" width={NODE_WIDTH} height="2" rx="2" />
      
      <g className="hero-orchestration-node-dot-wrapper">
        <circle 
          className="hero-orchestration-node-dot-ring" 
          cx="28" 
          cy="31" 
          r="6"
          style={{ stroke: node.accent }}
        />
        <circle 
          className="hero-orchestration-node-dot" 
          cx="28" 
          cy="31" 
          r="5"
          style={{ fill: node.accent }}
        />
      </g>
      
      <text className="hero-orchestration-node-label" x="46" y="33">
        {node.label}
      </text>
      <text className="hero-orchestration-node-meta" x="46" y="56">
        {node.meta}
      </text>
<<<<<<< HEAD
      
      {isExpanded && (
        <foreignObject
          className="hero-orchestration-node-explanation"
          x="0"
          y={NODE_HEIGHT + 12}
          width={NODE_WIDTH}
          height={EXPLANATION_HEIGHT}
        >
          <div xmlns="http://www.w3.org/1999/xhtml" className="hero-orchestration-node-explanation-card">
            <span className="hero-orchestration-node-explanation-kicker">How Flowfex handles it</span>
            <p>{node.explanation}</p>
          </div>
        </foreignObject>
      )}
=======
>>>>>>> bd24a3e (gpt5.5)
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
  const activeNode = useMemo(
    () => HERO_NODES.find((node) => node.id === expandedNode) || null,
    [expandedNode]
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
    <div ref={sceneRef} className="hero-orchestration-scene" aria-label="Flowfex orchestration overview">
      <svg
        className="hero-orchestration-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMin slice"
      >
        <defs>
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
<<<<<<< HEAD
=======

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
>>>>>>> bd24a3e (gpt5.5)
    </div>
  );
}
