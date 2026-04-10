import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Link2, Code2 } from 'lucide-react';
import ParticleField from '../components/animations/ParticleFieldSimple';
import SignalWave from '../components/animations/SignalWave';
import LiquidMetalText from '../components/animations/LiquidMetalText';
import PortalButton from '../components/animations/PortalButton';
import FlowfexLogo from '../assets/FlowfexLogo';
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
            <FlowfexLogo variant="full" size={32} animated={false} />
          </div>
          <div className="nav-actions">
            <button className="btn-ghost" onClick={() => navigate('/signin')}>
              Sign In
            </button>
            <button className="btn-primary" onClick={() => navigate('/onboarding')}>
              Start Building
            </button>
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
          </p>
          <div className="hero-cta-group">
            <PortalButton onClick={() => navigate('/onboarding')}>
              Start Building
              <span className="cta-note">— it's free</span>
            </PortalButton>
            <button className="btn-ghost btn-watch">
              Watch it work
              <ArrowRight size={16} style={{ transition: 'transform 0.2s' }} />
            </button>
          </div>
        </div>
      </section>

      {/* Feature Section 1 */}
      <section className="feature-section">
        <div className="feature-content">
          <div className="feature-text">
            <h2 className="feature-heading">Orchestration Made Visible</h2>
            <p className="feature-description">
              Every tool selection, every decision point, every execution path rendered in real time. 
              No black boxes. No guessing. Just pure visibility into how your AI thinks.
            </p>
          </div>
          <div className="feature-visual">
            <div className="mini-canvas-container">
              <svg className="mini-canvas" viewBox="0 0 400 300">
                <defs>
                  <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7A6A5C" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#9E3028" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
                <path d="M 100 50 Q 150 100 200 150" stroke="url(#edgeGradient)" strokeWidth="2" fill="none" />
                <path d="M 200 150 Q 250 180 300 200" stroke="url(#edgeGradient)" strokeWidth="2" fill="none" />
                <circle cx="100" cy="50" r="20" fill="#1C1812" stroke="#9E3028" strokeWidth="2" />
                <circle cx="200" cy="150" r="20" fill="#1C1812" stroke="#C49530" strokeWidth="2" className="animate-pulse" />
                <circle cx="300" cy="200" r="20" fill="#1C1812" stroke="#7A6A5C" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2 */}
      <section className="feature-section feature-section-reverse">
        <div className="feature-content">
          <div className="feature-visual">
            <div className="connection-methods">
              <div className="method-badge">
                <Zap size={16} />
                <span>Prompt</span>
              </div>
              <div className="method-badge">
                <Link2 size={16} />
                <span>Link</span>
              </div>
              <div className="method-badge">
                <Code2 size={16} />
                <span>SDK</span>
              </div>
              <div className="method-badge">
                <ArrowRight size={16} />
                <span>Live Channel</span>
              </div>
            </div>
          </div>
          <div className="feature-text">
            <h2 className="feature-heading">Connect Anything</h2>
            <p className="feature-description">
              Claude, GPT, custom agents, local models. If it can think, Flowfex can orchestrate it. 
              Four connection methods. Zero vendor lock-in.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Section 3 */}
      <section className="feature-section">
        <div className="feature-content">
          <div className="feature-text">
            <h2 className="feature-heading">Stay in Control</h2>
            <p className="feature-description">
              Approve critical steps. Reject bad paths. Constrain tool selection. 
              You supervise. Flowfex orchestrates.
            </p>
          </div>
          <div className="feature-visual">
            <div className="control-panel-mockup">
              <div className="approval-card">
                <div className="approval-header">
                  <span className="badge badge-indian-yellow">APPROVAL NEEDED</span>
                </div>
                <div className="approval-body">
                  <p>Execute database query?</p>
                  <div className="approval-actions">
                    <button className="btn-ghost btn-sm">Reject</button>
                    <button className="btn-primary btn-sm">Approve</button>
                  </div>
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
          <FlowfexLogo variant="full" size={28} animated={false} />
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
