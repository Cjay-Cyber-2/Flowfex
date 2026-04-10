import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Link2, Code2, Play, Pause, Settings, Eye } from 'lucide-react';
import ParticleField from '../components/animations/ParticleFieldSimple';
import SignalWave from '../components/animations/SignalWave';
import LiquidMetalText from '../components/animations/LiquidMetalText';
import PortalButton from '../components/animations/PortalButton';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import '../styles/landing.css';

function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const scrollProgressRef = useRef(null);

  useEffect(() => {
    // Liquid metal text is handled by the component now

    // Scroll-reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.feature-section, .modes-section').forEach((section) => {
      observer.observe(section);
    });

    // Scroll progress bar
    const handleScroll = () => {
      if (scrollProgressRef.current) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        scrollProgressRef.current.style.width = `${scrollPercent}%`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Scroll Progress Bar */}
      <div ref={scrollProgressRef} className="scroll-progress" style={{ width: '0%' }} />
      
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="wordmark-container" onClick={() => navigate('/')}>
            <FlowfexLogoNew size={32} animated={true} />
            <span className="nav-wordmark">Flowfex</span>
          </div>
          <div className="nav-actions">
            <button className="btn-ghost" onClick={() => navigate('/signin')}>
              Sign In
            </button>
            <PortalButton onClick={() => navigate('/onboarding')}>
              Start Building
            </PortalButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" ref={heroRef}>
        <ParticleField />
        <SignalWave />
        <div className="hero-content">
          <div className="hero-eyebrow">VISUAL AI ORCHESTRATION</div>
          <LiquidMetalText 
            text="See every step your AI takes."
            className="hero-headline"
          />
          <p className="hero-subheadline">
            Connect any agent. Watch it think, route, and execute. Guide it when it matters.
            <br />
            <span className="highlight-text">Make AI execution visible, controllable, and understandable.</span>
          </p>
          <div className="hero-cta-group">
            <PortalButton onClick={() => navigate('/onboarding')}>
              Start Building
              <span className="cta-note">— it's free</span>
            </PortalButton>
            <button className="btn-ghost btn-watch">
              <Play size={16} />
              Watch Demo
              <ArrowRight size={16} className="arrow-icon" />
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">380+</div>
              <div className="stat-label">AI Skills</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">6</div>
              <div className="stat-label">Connection Methods</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">∞</div>
              <div className="stat-label">Agent Types</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="problem-section">
        <div className="problem-content">
          <div className="problem-text">
            <h2 className="section-heading">The Problem with AI Today</h2>
            <div className="problem-grid">
              <div className="problem-item">
                <div className="problem-icon">🔒</div>
                <h3>Opaque Processes</h3>
                <p>AI tools hide their steps. You send a request, wait, and get results with no visibility into what happened.</p>
              </div>
              <div className="problem-item">
                <div className="problem-icon">🔧</div>
                <h3>Fragmented Tools</h3>
                <p>Every agent works differently. IDE agents, CLI tools, web apps - all disconnected experiences.</p>
              </div>
              <div className="problem-item">
                <div className="problem-icon">🎛️</div>
                <h3>No Control</h3>
                <p>You can't pause, approve, or redirect AI execution. It's all or nothing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="solution-section">
        <div className="solution-content">
          <h2 className="section-heading">Flowfex Changes Everything</h2>
          <p className="section-subtitle">
            The universal orchestration layer that makes AI execution visible, controllable, and understandable.
          </p>
          <div className="solution-demo">
            <div className="demo-container">
              <div className="demo-header">
                <FlowfexLogoNew size={24} animated={true} />
                <span>Live Orchestration</span>
                <div className="demo-controls">
                  <button className="demo-btn"><Play size={14} /></button>
                  <button className="demo-btn"><Pause size={14} /></button>
                  <button className="demo-btn"><Settings size={14} /></button>
                </div>
              </div>
              <div className="demo-canvas">
                <svg viewBox="0 0 600 400" className="demo-graph">
                  <defs>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9E3028" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#C49530" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* Animated flow paths */}
                  <path d="M 50 200 Q 150 100 250 200 Q 350 300 450 200 Q 500 150 550 200" 
                        stroke="url(#flowGradient)" 
                        strokeWidth="3" 
                        fill="none" 
                        className="flow-path" />
                  
                  {/* Nodes */}
                  <g className="demo-nodes">
                    <circle cx="50" cy="200" r="15" fill="#1C1812" stroke="#9E3028" strokeWidth="2" className="node-pulse" />
                    <text x="50" y="230" textAnchor="middle" fill="#EDE8DF" fontSize="10">Input</text>
                    
                    <circle cx="200" cy="150" r="15" fill="#1C1812" stroke="#C49530" strokeWidth="2" className="node-active" />
                    <text x="200" y="180" textAnchor="middle" fill="#EDE8DF" fontSize="10">Analyze</text>
                    
                    <circle cx="350" cy="200" r="15" fill="#1C1812" stroke="#3D7A6A" strokeWidth="2" />
                    <text x="350" y="230" textAnchor="middle" fill="#EDE8DF" fontSize="10">Execute</text>
                    
                    <circle cx="500" cy="180" r="15" fill="#1C1812" stroke="#7A6A5C" strokeWidth="1" />
                    <text x="500" y="210" textAnchor="middle" fill="#EDE8DF" fontSize="10">Output</text>
                  </g>
                  
                  {/* Flowing particles */}
                  <circle r="4" fill="#C49530" className="flow-particle">
                    <animateMotion dur="3s" repeatCount="indefinite">
                      <mpath href="#flowPath"/>
                    </animateMotion>
                  </circle>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-grid-section">
        <div className="features-content">
          <h2 className="section-heading">Three Layers of Intelligence</h2>
          <div className="features-grid">
            
            <div className="feature-card structure-layer">
              <div className="feature-icon">
                <div className="icon-structure"></div>
              </div>
              <h3>Structure Layer</h3>
              <p>Graph-based visualization of nodes, connections, relationships, and dependencies. See the topology of your AI's thinking.</p>
              <div className="feature-demo">
                <div className="structure-demo">
                  <div className="demo-node"></div>
                  <div className="demo-node"></div>
                  <div className="demo-node"></div>
                  <div className="demo-connection"></div>
                  <div className="demo-connection"></div>
                </div>
              </div>
            </div>

            <div className="feature-card execution-layer">
              <div className="feature-icon">
                <div className="icon-execution"></div>
              </div>
              <h3>Execution Layer</h3>
              <p>Workflow automation with ordered paths, branching logic, tool chaining, and multi-step execution flows.</p>
              <div className="feature-demo">
                <div className="execution-demo">
                  <div className="flow-line"></div>
                  <div className="flow-branch"></div>
                  <div className="flow-merge"></div>
                </div>
              </div>
            </div>

            <div className="feature-card energy-layer">
              <div className="feature-icon">
                <div className="icon-energy"></div>
              </div>
              <h3>Energy Layer</h3>
              <p>Live animation system with pulses, glows, motion, and active path highlighting. Feel the AI come alive.</p>
              <div className="feature-demo">
                <div className="energy-demo">
                  <div className="energy-pulse"></div>
                  <div className="energy-glow"></div>
                  <div className="energy-flow"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Section 4 - Modes */}
      <section className="feature-section modes-section">
        <h2 className="section-heading">Three Ways to See</h2>
        <div className="modes-grid">
          <div className="mode-card">
            <div className="mode-icon">MAP</div>
            <h3 className="mode-name">Map Mode</h3>
            <p className="mode-description">
              See the full topology. Understand relationships. Navigate complexity.
            </p>
          </div>
          <div className="mode-card">
            <div className="mode-icon">FLOW</div>
            <h3 className="mode-name">Flow Mode</h3>
            <p className="mode-description">
              Follow active paths. Watch decisions branch. Track execution in real time.
            </p>
          </div>
          <div className="mode-card">
            <div className="mode-icon">LIVE</div>
            <h3 className="mode-name">Live Mode</h3>
            <p className="mode-description">
              Maximum detail. Every particle. Every pulse. Intelligence made visible.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <div className="final-cta-content">
          <h2 className="final-cta-heading">Ready to see what your AI is doing?</h2>
          <div className="final-cta-buttons">
            <button className="btn-primary btn-hero" onClick={() => navigate('/onboarding')}>
              Start Building
            </button>
            <button className="btn-ghost" onClick={() => navigate('/signin')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <FlowfexLogoNew size={28} animated={false} />
          <div className="footer-links">
            <a href="#docs">Documentation</a>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
