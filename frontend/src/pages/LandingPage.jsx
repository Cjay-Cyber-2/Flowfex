import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { ArrowRight, ChevronRight, Play, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import FlowIcon from '../components/common/FlowIcon';
import ParticleField from '../components/animations/ParticleFieldSimple';
import SignalWave from '../components/animations/SignalWave';
import ScrollFrameSection from '../components/landing/ScrollFrameSection';
import { buildDemoWorkspace } from '../store/demoData';
import { ContainerScroll } from '../components/animations/ContainerScroll';
import { ParticleTextEffect } from '../components/animations/ParticleTextEffect';

// Lazy load heavier sections
const SocialProofSection = React.lazy(() => import('../components/landing/SocialProofSection'));
const DeveloperSection = React.lazy(() => import('../components/landing/DeveloperSection'));
const ModernPricingSection = React.lazy(() => import('../components/landing/ModernPricingSection'));
const FAQSection = React.lazy(() => import('../components/landing/FAQSection'));

import '../styles/landing.css';
import '../styles/landing/social-proof.css';
import '../styles/landing/developer.css';
import '../styles/landing/pricing.css';
import '../styles/landing/faq.css';
import '../styles/landing/modern-pricing.css';

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

function renderFlowGraph(nodes, edges, prefix, showLabels = false, customViewBox = null) {
  const nodeMap = nodes.reduce((result, node) => {
    result[node.id] = node;
    return result;
  }, {});

  return (
    <svg viewBox={customViewBox || "0 0 2480 820"} className="landing-flow-graph">
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

const HERO_GRAPH = {
  nodes: [
    {
      id: 'hero-cli',
      shape: 'rect',
      x: 80,
      y: 120,
      width: 120,
      height: 50,
      title: 'CLI',
      subtitle: '',
      state: 'completed',
      icon: 'message-square',
    },
    {
      id: 'hero-ide',
      shape: 'rect',
      x: 80,
      y: 220,
      width: 120,
      height: 50,
      title: 'IDE',
      subtitle: '',
      state: 'completed',
      icon: 'layers',
    },
    {
      id: 'hero-web',
      shape: 'rect',
      x: 80,
      y: 320,
      width: 120,
      height: 50,
      title: 'Web',
      subtitle: '',
      state: 'queued',
      icon: 'globe',
    },
    {
      id: 'hero-bridge',
      shape: 'rect',
      x: 380,
      y: 210,
      width: 140,
      height: 60,
      title: 'Flowfex',
      subtitle: '',
      state: 'active',
      icon: 'git-branch',
    },
    {
      id: 'hero-skill-pull',
      shape: 'rect',
      x: 680,
      y: 130,
      width: 120,
      height: 50,
      title: 'Skills',
      subtitle: '',
      state: 'completed',
      icon: 'sparkles',
    },
    {
      id: 'hero-tool-pull',
      shape: 'rect',
      x: 680,
      y: 290,
      width: 120,
      height: 50,
      title: 'Tools',
      subtitle: '',
      state: 'queued',
      icon: 'database',
    },
    {
      id: 'hero-canvas',
      shape: 'rect',
      x: 980,
      y: 210,
      width: 120,
      height: 60,
      title: 'Canvas',
      subtitle: '',
      state: 'approval',
      icon: 'shield-check',
    },
  ],
  edges: [
    { id: 'hero-edge-cli', from: 'hero-cli', to: 'hero-bridge', state: 'completed' },
    { id: 'hero-edge-ide', from: 'hero-ide', to: 'hero-bridge', state: 'completed' },
    { id: 'hero-edge-web', from: 'hero-web', to: 'hero-bridge', state: 'queued' },
    { id: 'hero-edge-skill', from: 'hero-bridge', to: 'hero-skill-pull', state: 'completed' },
    { id: 'hero-edge-tool', from: 'hero-bridge', to: 'hero-tool-pull', state: 'queued' },
    { id: 'hero-edge-canvas-skill', from: 'hero-skill-pull', to: 'hero-canvas', state: 'active' },
    { id: 'hero-edge-canvas-tool', from: 'hero-tool-pull', to: 'hero-canvas', state: 'queued' },
  ],
};

function LandingPage() {
  const navigate = useNavigate();
  const scrollProgressRef = useRef(null);
  const [activeSection, setActiveSection] = useState('hero');
  const clickLockRef = useRef(false);

  const workspace = useMemo(() => buildDemoWorkspace(), []);
  const sectionIds = [
    { id: 'hero', label: 'Hero' },
    { id: 'statement', label: 'Vision' },
    { id: 'problem', label: 'Problem' },
    { id: 'reveal', label: 'Bridge' },
    { id: 'layers', label: 'Layers' },
    { id: 'demo', label: 'Preview' },
    { id: 'bridge', label: 'Connect' },
    { id: 'developer', label: 'Developers' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'faq', label: 'FAQ' },
    { id: 'final', label: 'Start' },
  ];

  const handleDotClick = (event, sectionId) => {
    event.preventDefault();
    setActiveSection(sectionId);
    clickLockRef.current = true;
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => {
      clickLockRef.current = false;
    }, 1200);
  };

  useEffect(() => {
    const sections = document.querySelectorAll('[data-section-id]');
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickLockRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section-id'));
          }
        });
      },
      { threshold: 0.3 }
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
          <FlowfexLogoNew size={32} animated={false} />
        </button>

        <div className="landing-nav-links">
          <a href="#problem">What It Is</a>
          <a href="#reveal">How It Works</a>
          <a href="#bridge">Connect</a>
          <a href="#developer">For Developers</a>
          <a href="#pricing">Pricing</a>
        </div>

        <button className="btn btn-primary landing-nav-cta" onClick={() => navigate('/onboarding')}>
          Start Free
        </button>
      </nav>

      <div className="landing-dot-nav">
        {sectionIds.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`landing-dot ${activeSection === section.id ? 'is-active' : ''}`}
            aria-label={section.label}
            data-label={section.label}
            onClick={(event) => handleDotClick(event, section.id)}
          />
        ))}
      </div>

      <section id="hero" data-section-id="hero" className="landing-section hero-section">
        <ParticleField />
        <SignalWave />
        <div className="hero-copy">
          <span className="section-kicker">Agent bridge and orchestration layer</span>
          <h1 className="hero-headline">
            <span>Connect any agent to the right tools and skills.</span>
            <span className="hero-headline-accent">Watch Flowfex route the work live.</span>
          </h1>
          <p className="hero-subheadline">
            Flowfex is a web app that sits between any agent and a shared store of tools, skills, and workflows.
            The agent pulls what it needs through Flowfex, and the dashboard shows the route in real time while
            you guide it when needed.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary hero-primary-cta" onClick={() => navigate('/onboarding')}>
              Start Building Free
              <span className="cta-note">live in minutes</span>
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
              <Play size={16} />
              Watch App Demo
            </button>
          </div>

          <div className="hero-metrics">
            <div>
              <strong>Universal bridge</strong>
              <span>IDE, CLI, web, and embedded agents</span>
            </div>
            <div>
              <strong>Resource routing</strong>
              <span>Pull the best tools and skills for the task</span>
            </div>
            <div>
              <strong>Live control</strong>
              <span>Pause, approve, reject, or reroute the flow</span>
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
              Bridge live · resource pull visible
            </div>
          </div>
          <div className="hero-graph-surface">{renderFlowGraph(HERO_GRAPH.nodes, HERO_GRAPH.edges, 'hero', false, "0 0 1180 480")}</div>
        </div>
      </section>

      {/* ── Statement section: ParticleTextEffect owns the full stage ── */}
      <section
        id="statement"
        data-section-id="statement"
        className="landing-section"
        style={{ padding: 0, background: '#000', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}
      >
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>
          What Flowfex does
        </p>
        <div style={{ width: '100%', maxWidth: '1100px', padding: '0 1.5rem' }}>
          <ParticleTextEffect
            words={['Connect', 'Route', 'Orchestrate', 'Approve', 'Monitor']}
          />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.75rem', letterSpacing: '0.08em', margin: 0 }}>
          Right-click + drag to scatter
        </p>
      </section>

      <section id="problem" data-section-id="problem" className="landing-section problem-section">
        <div className="section-copy">
          <span className="section-kicker section-kicker-accent">The problem</span>
          <h2>Agents need one shared place to pull the right resources.</h2>
          <p>
            Teams already have useful tools, skills, prompts, and workflows, but they live in different places.
            Flowfex gives every agent one bridge into that resource layer and one live view for the user.
          </p>

          <div className="problem-card-list">
            <article className="problem-card">
              <Sparkles size={18} />
              <div>
                <h3>Scattered resources</h3>
                <p>Your best skills and tools stay split across prompts, scripts, and local setups.</p>
              </div>
            </article>
            <article className="problem-card">
              <Workflow size={18} />
              <div>
                <h3>Different agent environments</h3>
                <p>CLI agents, side-panel agents, web agents, and app agents all connect in different ways.</p>
              </div>
            </article>
            <article className="problem-card">
              <ShieldCheck size={18} />
              <div>
                <h3>Hard to guide live</h3>
                <p>Once the run starts, users need to see what was pulled and where to step in.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="problem-visual">
          <div className="black-box-demo">
            <div className="black-box-query">Agent needs docs, memory, skills, and deploy tools.</div>
            <div className="black-box-core">Scattered resources</div>
            <div className="black-box-result">Lower efficiency. Different behavior. No shared live view.</div>
          </div>
        </div>
      </section>

      <section id="reveal" data-section-id="reveal" className="landing-section reveal-section">
        <div className="section-copy">
          <span className="section-kicker">What Flowfex does</span>
          <h2>Flowfex sits between the agent and the resource layer.</h2>
          <p>
            The agent connects once. Flowfex reads the task, picks the right skills and tools, builds the flow,
            and streams each step back to the dashboard and the calling agent.
          </p>
        </div>

        <div className="reveal-stage">
          <div className="reveal-stage-canvas">{renderFlowGraph(workspace.nodes, workspace.edges, 'reveal', true)}</div>
          <div className="reveal-stage-panel">
            <span className="section-kicker">Live bridge session</span>
            <h3>Connect. Pull. Guide. Return.</h3>
            <p>
              Flowfex does not replace the agent. It gives the agent a better resource layer and gives the user
              one live place to supervise the run.
            </p>
            <ul>
              <li>Connected agent: IDE, CLI, browser, or app agent</li>
              <li>Pulled resources: tools, skills, memory, and workflows</li>
              <li>User controls: pause, approve, reject, or reroute</li>
            </ul>
            <div className="reveal-stage-buttons">
              <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
                Connect Agent
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                See the Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="layers" data-section-id="layers" className="landing-section layers-section">
        <div className="section-heading-block">
          <span className="section-kicker">How it works</span>
          <h2>Two layers. One living system.</h2>
          <p>Structure and execution working together in one shared bridge.</p>
        </div>

        <div className="layers-grid">
          <article className="layer-card layer-card-large">
            <span className="layer-icon">
              <Workflow size={18} />
            </span>
            <h3>Structure Layer</h3>
            <p>See agents, tools, skills, dependencies, and state in one map.</p>
            <div className="layer-visual">{renderFlowGraph(workspace.nodes.slice(0, 6), workspace.edges.slice(0, 7), 'structure', false, "0 0 1600 600")}</div>
          </article>

          <article className="layer-card">
            <span className="layer-icon">
              <ChevronRight size={18} />
            </span>
            <h3>Execution Layer</h3>
            <p>Follow the order, branches, reroutes, and return path while the task runs.</p>
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

      <ScrollFrameSection />

      {/* ContainerScroll wraps the demo browser — 3D perspective reveals on scroll */}
      <section id="demo" data-section-id="demo" className="landing-section demo-section" style={{ padding: 0, overflow: 'hidden' }}>
        <ContainerScroll
          titleComponent={
            <div className="section-heading-block" style={{ marginBottom: '2rem' }}>
              <span className="section-kicker">Product preview</span>
              <h2 style={{ marginBottom: '0.75rem' }}>The dashboard shows what connected, what was pulled, and where the flow is going.</h2>
              <p>
                Flowfex is not a static graph mock. The main app is a live control surface with sessions, a graph
                canvas, and clear places where the user can step in.
              </p>
            </div>
          }
        >
          {/* Dashboard preview lives inside the 3D card */}
          <div className="demo-browser-body" style={{ height: '100%', background: 'var(--surface-01, #12171f)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div className="demo-browser-rail">
              <strong>Connected now</strong>
              <span>CLI agent</span>
              <span>Skill store</span>
              <span>Session controls</span>
            </div>
            <div className="demo-browser-canvas" style={{ flex: 1 }}>{renderFlowGraph(workspace.nodes, workspace.edges, 'browser', false)}</div>
            <div className="demo-browser-panel">
              <strong>Visible in one place</strong>
              <span>Current step + pulled resources</span>
              <p>Users can inspect nodes, see why a resource was chosen, and step in without rebuilding the whole flow.</p>
            </div>
          </div>
        </ContainerScroll>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', paddingBottom: '2rem' }}>
          <div className="demo-callout demo-callout-left">Agent attached</div>
          <div className="demo-callout demo-callout-right">Resource pull visible</div>
          <div className="demo-callout demo-callout-bottom">Pause, approve, or reroute here</div>
        </div>
      </section>

      {/* New GODMODE Sections */}
      <Suspense fallback={null}>
        <SocialProofSection />
      </Suspense>

      <Suspense fallback={null}>
        <DeveloperSection />
      </Suspense>

      <Suspense fallback={null}>
        <ModernPricingSection />
      </Suspense>

      <Suspense fallback={null}>
        <FAQSection />
      </Suspense>

      <section id="final" data-section-id="final" className="landing-section final-section">
        <div className="final-canvas-background">
          <ParticleField />
        </div>
        <div className="final-panel">
          <span className="section-kicker">Start with one connection</span>
          <h2>
            Give <span className="final-headline-highlight">every agent</span> one place to pull the right tools and skills.
          </h2>
          <p>
            Start a session, connect an agent, and let Flowfex turn scattered resources into a live flow you can understand and steer.
          </p>
          <div className="final-actions">
            <button className="btn btn-primary final-cta-enhanced" onClick={() => navigate('/onboarding')}>
              Start Building Free
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
              See the Dashboard
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="final-trust-line">
            Start free · Anonymous session first · Sign up when you need to save
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
