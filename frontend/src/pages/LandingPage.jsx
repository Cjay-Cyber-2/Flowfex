import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { ArrowRight, ChevronRight, Network, Play, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import HeroOrchestrationScene from '../components/animations/HeroOrchestrationScene';
import FlowIcon from '../components/common/FlowIcon';
import ScrollFrameSection from '../components/landing/ScrollFrameSection';
import DotNavigation from '../components/landing/DotNavigation';
import { buildDemoWorkspace } from '../store/demoData';
import useStore from '../store/useStore';
import { ContainerScroll } from '../components/animations/ContainerScroll';

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
import '../styles/DotNavigation.css';

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

const FALLBACK_CATALOG_STATS = {
  skillsIndexed: 309,
  agentTemplates: 64,
  multiAgentSystems: 45,
  mcpAgentSkills: 11,
  categories: 14,
};

function formatCatalogCount(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function getSkillSourcePath(skill) {
  return String(skill?.metadata?.sourcePath || skill?.sourcePath || skill?.path || '').replace(/\\/g, '/');
}

function getCatalogProjectKey(skill) {
  const sourcePath = getSkillSourcePath(skill);
  if (!sourcePath) return '';

  const segments = sourcePath.split('/').filter(Boolean);
  const rootIndex = segments.indexOf('skills-md');
  const scopedSegments = rootIndex >= 0 ? segments.slice(rootIndex + 1) : segments;
  const fileName = scopedSegments[scopedSegments.length - 1] || '';

  if (/^readme\.md$/i.test(fileName) && scopedSegments.length > 1) {
    return scopedSegments.slice(0, -1).join('/');
  }

  return scopedSegments.join('/');
}

function isMultiAgentSkill(skill) {
  const haystack = [
    getSkillSourcePath(skill),
    skill?.id,
    skill?.name,
    skill?.title,
    skill?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return [
    '/multi-agent-teams/',
    '/multi_agent_apps/',
    'multi agent',
    'multi-agent',
    'multi_agent',
    'agent team',
    'agent-team',
    'agent_team',
    'agent teams',
    'agent_teams',
    'mixture_of_agents',
    'multi_mcp_agent',
  ].some((pattern) => haystack.includes(pattern));
}

function isAgentSkill(skill) {
  if (isMultiAgentSkill(skill)) {
    return false;
  }

  const haystack = [
    getSkillSourcePath(skill),
    skill?.id,
    skill?.name,
    skill?.title,
    skill?.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return [
    '/starter-ai-agents/',
    '/voice-ai-agents/',
    '/mcp-ai-agents/',
    '/advanced-ai-agents/',
    '/game-agents/',
    '/agent-skills/',
    '/chat-with-x/',
    ' agent ',
    ' agents ',
    '_agent',
    '-agent',
    '_agents',
    '-agents',
  ].some((pattern) => haystack.includes(pattern));
}

function countUniqueProjects(tools, predicate) {
  const uniqueProjects = new Set();

  tools.forEach((tool) => {
    if (!predicate(tool)) return;
    const projectKey = getCatalogProjectKey(tool);
    if (projectKey) {
      uniqueProjects.add(projectKey);
    }
  });

  return uniqueProjects.size;
}

function deriveCatalogStats(payload) {
  const tools = Array.isArray(payload?.tools) ? payload.tools : [];
  const summary = payload?.summary || {};

  if (tools.length === 0 && !summary.totalTools) {
    return FALLBACK_CATALOG_STATS;
  }

  const agentTemplates = countUniqueProjects(tools, isAgentSkill);
  const multiAgentSystems = countUniqueProjects(tools, isMultiAgentSkill);
  const mcpAgentSkills = countUniqueProjects(
    tools,
    (tool) => getSkillSourcePath(tool).includes('/mcp-ai-agents/')
  );
  const categories = Number(summary.totalCategories) || new Set(tools.map((tool) => tool.category).filter(Boolean)).size;

  return {
    skillsIndexed: Number(summary.markdownTools || summary.totalTools || tools.length) || FALLBACK_CATALOG_STATS.skillsIndexed,
    agentTemplates: agentTemplates || FALLBACK_CATALOG_STATS.agentTemplates,
    multiAgentSystems: multiAgentSystems || FALLBACK_CATALOG_STATS.multiAgentSystems,
    mcpAgentSkills: mcpAgentSkills || FALLBACK_CATALOG_STATS.mcpAgentSkills,
    categories: categories || FALLBACK_CATALOG_STATS.categories,
  };
}


function LandingPage() {
  const navigate = useNavigate();
  const backendUrl = useStore((state) => state.backendUrl);
  const scrollProgressRef = useRef(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [catalogStats, setCatalogStats] = useState(FALLBACK_CATALOG_STATS);
  const clickLockRef = useRef(false);

  const workspace = useMemo(() => buildDemoWorkspace(), []);
  
  const statementMetrics = useMemo(
    () => [
      {
        label: 'Skill records',
        value: formatCatalogCount(catalogStats.skillsIndexed),
        detail: 'Live markdown skill records indexed into Flowfex for search, validation, and routing.',
        icon: Sparkles,
      },
      {
        label: 'Agent templates',
        value: formatCatalogCount(catalogStats.agentTemplates),
        detail: 'Single-agent templates Flowfex can surface across research, workflow, app, and voice use cases.',
        icon: Network,
      },
      {
        label: 'Multi-agent systems',
        value: formatCatalogCount(catalogStats.multiAgentSystems),
        detail: 'Coordinated multi-agent systems available for planning, execution, review, and handoff.',
        icon: Workflow,
      },
    ],
    [catalogStats]
  );
  const statementCatalogCards = useMemo(
    () => [
      {
        label: 'Skills',
        value: formatCatalogCount(catalogStats.skillsIndexed),
        detail: 'Real skill records currently available to the Flowfex routing layer.',
      },
      {
        label: 'Agents',
        value: formatCatalogCount(catalogStats.agentTemplates),
        detail: 'Single-agent templates available across the imported catalog.',
      },
      {
        label: 'Multi Agents',
        value: formatCatalogCount(catalogStats.multiAgentSystems),
        detail: 'Multi-agent systems ready for coordinated execution and review.',
      },
    ],
    [catalogStats]
  );
  const statementCatalogTrack = useMemo(
    () => [...statementCatalogCards, ...statementCatalogCards],
    [statementCatalogCards]
  );

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

  const handleSectionChange = (sectionId) => {
    clickLockRef.current = true;
    setActiveSection(sectionId);
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogStats() {
      try {
        const response = await fetch(`${backendUrl}/skills`);
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) {
          setCatalogStats(deriveCatalogStats(payload));
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Landing catalog stats fallback in use:', error);
        }
      }
    }

    if (backendUrl) {
      loadCatalogStats();
    }

    return () => {
      cancelled = true;
    };
  }, [backendUrl]);

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

      <DotNavigation 
        sections={sectionIds} 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
      />

      <section id="hero" data-section-id="hero" className="landing-section hero-section">
        <HeroOrchestrationScene />

        <div className="hero-copy hero-copy-centered">
          <span className="section-kicker">Skill orchestration for live agents</span>
          <h1 className="hero-headline">
            <span style={{ fontWeight: 'bold', letterSpacing: '0.02em' }}>The skill operating layer for connected agents.</span>
          </h1>
          <p className="hero-subheadline">
            Match tasks semantically, and keep human approval and decision transparency inside one orchestration surface.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary hero-primary-cta" onClick={() => navigate('/onboarding')}>
              Start Building Free
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
              <Play size={16} />
              Watch Live Demo
            </button>
          </div>
        </div>
      </section>

      <section
        id="statement"
        data-section-id="statement"
        className="landing-section statement-section"
      >
        <p className="statement-kicker">
          What Flowfex does
        </p>
        <div className="statement-animation-wrap" aria-label="Flowfex live catalog coverage">
          <div className="statement-catalog">
            <div className="statement-catalog-track">
              {statementCatalogTrack.map((card, index) => (
                <article
                  key={`${card.label}-${index}`}
                  className="statement-catalog-card"
                  aria-hidden={index >= statementCatalogCards.length}
                >
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                  <p>{card.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="statement-metrics" aria-label="Flowfex catalog facts">
          {statementMetrics.map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="statement-metric">
              <span className="statement-metric-icon">
                <Icon size={18} />
              </span>
              <strong>{value}</strong>
              <span>{label}</span>
              <p>{detail}</p>
            </article>
          ))}
        </div>
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
      <section id="demo" data-section-id="demo" className="landing-section demo-section" style={{ padding: '4rem 0 0', overflow: 'visible' }}>
        <ContainerScroll
          titleComponent={
            <div className="section-heading-block" style={{ marginBottom: '2rem', maxWidth: '900px' }}>
              <span className="section-kicker">Product preview</span>
              <h2 style={{ marginBottom: '0.75rem', fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)' }}>The dashboard shows what connected, what was pulled, and where the flow is going.</h2>
              <p style={{ maxWidth: '800px', margin: '0 auto' }}>
                Flowfex is not a static graph mock. The main app is a live control surface with sessions, a graph
                canvas, and clear places where the user can step in.
              </p>
            </div>
          }
        >
          {/* Dashboard preview lives inside the 3D card */}
          <div className="demo-browser-body" style={{ height: '100%', background: 'var(--surface-01, #12171f)', borderRadius: '0.75rem', overflow: 'auto' }}>
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
              <p style={{ lineHeight: 1.6, marginBottom: 0 }}>Users can inspect nodes, see why a resource was chosen, and step in without rebuilding the whole flow.</p>
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
