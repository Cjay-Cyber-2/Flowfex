import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { ArrowRight, ChevronRight, Play, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import FlowIcon from '../components/common/FlowIcon';
import ParticleField from '../components/animations/ParticleFieldSimple';
import PortalButton from '../components/animations/PortalButton';
import SignalWave from '../components/animations/SignalWave';
import ScrollFrameSection from '../components/landing/ScrollFrameSection';
import { buildDemoWorkspace } from '../store/demoData';

// Lazy load the new sections for better performance
const SocialProofSection = React.lazy(() => import('../components/landing/SocialProofSection'));
const DeveloperSection = React.lazy(() => import('../components/landing/DeveloperSection'));
const PricingSection = React.lazy(() => import('../components/landing/PricingSection'));
const FAQSection = React.lazy(() => import('../components/landing/FAQSection'));

import '../styles/landing.css';
// Import new section styles
import '../styles/landing/social-proof.css';
import '../styles/landing/developer.css';
import '../styles/landing/pricing.css';
import '../styles/landing/faq.css';

function getNodeDimensions(node) {
  return {
    width: node.width || 180,
    height: node.height || 96,
  };
}

function getNodeCenter(node) {
  const { width, height } = getNodeDimensions(node);
  return { x: node.x + width / 2, y: node.y + height / 2 };
}

function getEdgeAnchors(fromNode, toNode) {
  const from = getNodeDimensions(fromNode);
  const to = getNodeDimensions(toNode);
  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      start: { x: fromCenter.x + (dx >= 0 ? from.width / 2 : -from.width / 2), y: fromCenter.y },
      end: { x: toCenter.x + (dx >= 0 ? -to.width / 2 : to.width / 2), y: toCenter.y },
    };
  }

  return {
    start: { x: fromCenter.x, y: fromCenter.y + (dy >= 0 ? from.height / 2 : -from.height / 2) },
    end: { x: toCenter.x, y: toCenter.y + (dy >= 0 ? -to.height / 2 : to.height / 2) },
  };
}

function getEdgePath(fromNode, toNode) {
  const { start, end } = getEdgeAnchors(fromNode, toNode);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const controlOffset = Math.max(120, Math.abs(dx) * 0.34);
    const direction = dx >= 0 ? 1 : -1;

    return `M ${start.x} ${start.y} C ${start.x + controlOffset * direction} ${start.y}, ${
      end.x - controlOffset * direction
    } ${end.y}, ${end.x} ${end.y}`;
  }

  const controlOffset = Math.max(90, Math.abs(dy) * 0.4);
  const direction = dy >= 0 ? 1 : -1;

  return `M ${start.x} ${start.y} C ${start.x} ${start.y + controlOffset * direction}, ${end.x} ${
    end.y - controlOffset * direction
  }, ${end.x} ${end.y}`;
}

function renderFlowGraph(nodes, edges, prefix, showLabels = false) {
  const nodeMap = nodes.reduce((result, node) => {
    result[node.id] = node;
    return result;
  }, {});

  return (
    <svg viewBox="0 0 2480 820" className="landing-flow-graph">
      <defs>
        <marker id={`${prefix}-arrow-active`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#00D4AA" />
        </marker>
        <marker id={`${prefix}-arrow-muted`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#42505f" />
        </marker>
        <marker id={`${prefix}-arrow-complete`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#46BDA9" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const fromNode = nodeMap[edge.from];
        const toNode = nodeMap[edge.to];
        if (!fromNode || !toNode) return null;

        const pathId = `${prefix}-${edge.id}`;
        const path = getEdgePath(fromNode, toNode);
        const labelX = fromNode.x + (toNode.x - fromNode.x) * 0.3;
        const labelY = fromNode.y + (toNode.y - fromNode.y) * 0.3 - 18;
        const stateClass = `landing-edge-${edge.state}`;
        const marker =
          edge.state === 'active' || edge.state === 'queued'
            ? `${prefix}-arrow-active`
            : edge.state === 'completed'
              ? `${prefix}-arrow-complete`
              : `${prefix}-arrow-muted`;

        return (
          <g key={edge.id}>
            <path id={pathId} d={path} className={`landing-edge ${stateClass}`} markerEnd={`url(#${marker})`} />
            {edge.state === 'active' ? (
              <circle className="landing-edge-pulse" r="5">
                <animateMotion dur="2.8s" repeatCount="indefinite" rotate="auto">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            ) : null}
            {showLabels && edge.label ? (
              <g transform={`translate(${labelX} ${labelY})`} className="landing-edge-label">
                <rect x="-32" y="-12" width="64" height="24" rx="12" />
                <text textAnchor="middle" dominantBaseline="middle">
                  {edge.label}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      {nodes.map((node) => {
        const { width, height } = getNodeDimensions(node);
        const center = getNodeCenter(node);
        const stateClass = `landing-node-${node.state}`;

        return (
          <g key={node.id} className={`landing-node ${stateClass}`}>
            {node.shape === 'diamond' ? (
              <polygon
                points={`${center.x},${node.y} ${node.x + width},${center.y} ${center.x},${node.y + height} ${node.x},${center.y}`}
              />
            ) : (
              <rect x={node.x} y={node.y} width={width} height={height} rx="24" />
            )}

            <g transform={`translate(${node.x + 18} ${node.y + 16})`} className="landing-node-icon">
              <rect width="28" height="28" rx="10" />
              <g transform="translate(5 5)">
                <FlowIcon name={node.icon} size={18} />
              </g>
            </g>

            <text className="landing-node-title" x={node.x + 56} y={node.y + 34}>
              {node.title}
            </text>
            <text className="landing-node-subtitle" x={node.x + 56} y={node.y + 58}>
              {node.subtitle}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const scrollProgressRef = useRef(null);
  const [activeSection, setActiveSection] = useState('hero');

  const workspace = useMemo(() => buildDemoWorkspace(), []);
  const sectionIds = [
    { id: 'hero', label: 'Hero' },
    { id: 'problem', label: 'Problem' },
    { id: 'reveal', label: 'Reveal' },
    { id: 'layers', label: 'Layers' },
    { id: 'demo', label: 'Demo' },
    { id: 'social-proof', label: 'Trust' },
    { id: 'developer', label: 'Developers' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
    { id: 'final', label: 'Start' },
  ];

  useEffect(() => {
    const sections = document.querySelectorAll('[data-section-id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section-id'));
          }
        });
      },
      { threshold: 0.45 }
    );

    sections.forEach((section) => observer.observe(section));

    const handleScroll = () => {
      if (!scrollProgressRef.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgressRef.current.style.width = `${(scrollTop / docHeight) * 100}%`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-page">
      <div ref={scrollProgressRef} className="landing-scroll-progress" />

      <nav className="landing-nav">
        <button className="landing-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <FlowfexLogoNew size={36} animated={false} />
          <span>Flowfex</span>
        </button>

        <div className="landing-nav-links">
          <a href="#problem">Product</a>
          <a href="#reveal">How It Works</a>
          <a href="#developer">For Developers</a>
          <a href="#social-proof">Trust</a>
          <a href="#pricing">Pricing</a>
        </div>

        <PortalButton className="landing-nav-cta" onClick={() => navigate('/onboarding')}>
          Start Free
        </PortalButton>
      </nav>

      <div className="landing-dot-nav">
        {sectionIds.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`landing-dot ${activeSection === section.id ? 'is-active' : ''}`}
            aria-label={section.label}
            data-label={section.label}
          />
        ))}
      </div>

      <section id="hero" data-section-id="hero" className="landing-section hero-section">
        <ParticleField />
        <SignalWave />
        <div className="hero-copy">
          <span className="section-kicker">Visual AI orchestration platform</span>
          <h1 className="hero-headline">
            <span>Your AI is thinking.</span>
            <span className="hero-headline-accent">Now you can see it.</span>
          </h1>
          <p className="hero-subheadline">
            Connect any agent. Watch every step. Control what matters. Flowfex turns opaque execution
            into a live intelligence surface with transparent paths, guarded approvals, and traceable decisions.
          </p>

          <div className="hero-actions">
            <PortalButton className="hero-primary-cta" onClick={() => navigate('/onboarding')}>
              Start Building Free
              <span className="cta-note">live in minutes</span>
            </PortalButton>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
              <Play size={16} />
              Watch Live Demo
            </button>
          </div>

          <div className="hero-metrics">
            <div>
              <strong>Live graph</strong>
              <span>Every edge traced</span>
            </div>
            <div>
              <strong>Approval gates</strong>
              <span>Intervene mid-flow</span>
            </div>
            <div>
              <strong>Universal bridge</strong>
              <span>IDE, CLI, web, SDK</span>
            </div>
          </div>
        </div>

        <div className="hero-graph-shell">
          <div className="hero-graph-chrome">
            <span />
            <span />
            <span />
            <div className="hero-graph-status">
              <span className="hero-graph-status-dot" />
              Awaiting approval on publish gate
            </div>
          </div>
          <div className="hero-graph-surface">{renderFlowGraph(workspace.nodes, workspace.edges, 'hero', false)}</div>
        </div>
      </section>

      <ScrollFrameSection />

      <section id="problem" data-section-id="problem" className="landing-section problem-section">
        <div className="section-copy">
          <span className="section-kicker section-kicker-accent">The problem</span>
          <h2>Most AI tools hide what they are doing.</h2>
          <p>
            Agents execute in a black box. They choose tools, branch logic, and publish results without exposing
            the chain of reasoning. That makes trust brittle and intervention impossible.
          </p>

          <div className="problem-card-list">
            <article className="problem-card">
              <Sparkles size={18} />
              <div>
                <h3>Opaque execution</h3>
                <p>You get outputs, not the path that produced them.</p>
              </div>
            </article>
            <article className="problem-card">
              <Workflow size={18} />
              <div>
                <h3>Fragmented agents</h3>
                <p>IDE tools, CLI agents, and web copilots all behave differently.</p>
              </div>
            </article>
            <article className="problem-card">
              <ShieldCheck size={18} />
              <div>
                <h3>No intervention layer</h3>
                <p>You cannot pause, approve, or reroute at the moment risk appears.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="problem-visual">
          <div className="black-box-demo">
            <div className="black-box-query">“Research the latest model launches.”</div>
            <div className="black-box-core">???</div>
            <div className="black-box-result">Summary returned. No reasoning attached.</div>
          </div>
        </div>
      </section>

      <section id="reveal" data-section-id="reveal" className="landing-section reveal-section">
        <div className="section-copy">
          <span className="section-kicker">Flowfex opens the process</span>
          <h2>Every skill selected. Every path taken. Every decision made visible.</h2>
          <p>
            Flowfex reveals the orchestration graph as it forms. The operator sees active edges, guarded nodes,
            alternatives considered, and the reason each step was chosen.
          </p>
        </div>

        <div className="reveal-stage">
          <div className="reveal-stage-canvas">{renderFlowGraph(workspace.nodes, workspace.edges, 'reveal', true)}</div>
          <div className="reveal-stage-panel">
            <span className="section-kicker">Decision transparency</span>
            <h3>Approval Gate</h3>
            <p>
              Publishing is guarded because the brief relies on fresh live sources and needs operator confirmation.
            </p>
            <ul>
              <li>Alternative: Auto publish</li>
              <li>Alternative: Pause entire session</li>
              <li>Current state: Awaiting approval</li>
            </ul>
            <div className="reveal-stage-buttons">
              <button className="btn btn-primary">Approve</button>
              <button className="btn btn-ghost">Reroute</button>
            </div>
          </div>
        </div>
      </section>

      <section id="layers" data-section-id="layers" className="landing-section layers-section">
        <div className="section-heading-block">
          <span className="section-kicker">How it works</span>
          <h2>Three layers. One living system.</h2>
          <p>Structure, execution, and energy working together in the same orchestration surface.</p>
        </div>

        <div className="layers-grid">
          <article className="layer-card layer-card-large">
            <span className="layer-icon">
              <Workflow size={18} />
            </span>
            <h3>Structure Layer</h3>
            <p>See nodes, branching decisions, agent states, and graph topology spatially.</p>
            <div className="layer-visual">{renderFlowGraph(workspace.nodes.slice(0, 6), workspace.edges.slice(0, 7), 'structure', false)}</div>
          </article>

          <article className="layer-card">
            <span className="layer-icon">
              <ChevronRight size={18} />
            </span>
            <h3>Execution Layer</h3>
            <p>Follow ordered paths, branch conditions, reroutes, and final publish handoffs.</p>
          </article>

          <article className="layer-card">
            <span className="layer-icon">
              <Zap size={18} />
            </span>
            <h3>Energy Layer</h3>
            <p>Active edges pulse, approvals breathe, and live computation never looks static.</p>
          </article>

          <article className="layer-card layer-card-wide">
            <span className="layer-icon">
              <ShieldCheck size={18} />
            </span>
            <h3>Connect anything</h3>
            <p>Prompt, link, SDK, or live channel. Attach the agent and Flowfex becomes the shared control surface.</p>
          </article>
        </div>
      </section>

      <section id="demo" data-section-id="demo" className="landing-section demo-section">
        <div className="section-heading-block">
          <span className="section-kicker">Live demo</span>
          <h2>The dashboard is the product.</h2>
          <p>
            Not a screenshot. Not a static workflow mock. A live control surface where the graph, the panels, and the approvals all agree.
          </p>
        </div>

        <div className="demo-browser">
          <div className="demo-browser-top">
            <div className="demo-browser-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="demo-browser-url">app.flowfex.io/dashboard</div>
          </div>

          <div className="demo-browser-body">
            <div className="demo-browser-rail">
              <strong>Connected Agents</strong>
              <span>VS Code Bridge</span>
              <span>Research Relay</span>
            </div>
            <div className="demo-browser-canvas">{renderFlowGraph(workspace.nodes, workspace.edges, 'browser', false)}</div>
            <div className="demo-browser-panel">
              <strong>Decision transparency</strong>
              <span>Why this was chosen</span>
              <p>Publishing is guarded because the brief was assembled from live research.</p>
            </div>
          </div>

          <div className="demo-callout demo-callout-left">Live edge pulses</div>
          <div className="demo-callout demo-callout-right">Approve or reroute mid-flow</div>
          <div className="demo-callout demo-callout-bottom">Context stays visible while the graph executes</div>
        </div>
      </section>

      {/* New GODMODE Sections */}
      <Suspense fallback={<div className="section-loading">Loading...</div>}>
        <SocialProofSection />
      </Suspense>

      <Suspense fallback={<div className="section-loading">Loading...</div>}>
        <DeveloperSection />
      </Suspense>

      <Suspense fallback={<div className="section-loading">Loading...</div>}>
        <PricingSection />
      </Suspense>

      <Suspense fallback={<div className="section-loading">Loading...</div>}>
        <FAQSection />
      </Suspense>

      <section id="final" data-section-id="final" className="landing-section final-section">
        <div className="final-canvas-background">
          <ParticleField />
        </div>
        <div className="final-panel">
          <span className="section-kicker">Start building</span>
          <h2>
            <span className="final-headline-highlight">See</span> what your agents are doing before they disappear behind the output.
          </h2>
          <p>
            Flowfex turns invisible orchestration into a visible, controllable, production-grade intelligence surface.
          </p>
          <div className="final-actions">
            <PortalButton className="final-cta-enhanced" onClick={() => navigate('/onboarding')}>
              Start Building Free
            </PortalButton>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
              Open Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="final-trust-line">
            No credit card required · Anonymous session · Upgrade when ready
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
