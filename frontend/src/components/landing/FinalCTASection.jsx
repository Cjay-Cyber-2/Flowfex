import React from 'react';
import { useNavigate } from 'react-router-dom';
import FlowfexLogo from '../../assets/FlowfexLogo';
import '../../styles/landing-sections3.css';

const SVG_NODES = [
  { cx: 120, cy: 80 }, { cx: 320, cy: 140 }, { cx: 520, cy: 60 },
  { cx: 700, cy: 180 }, { cx: 200, cy: 260 }, { cx: 440, cy: 300 },
  { cx: 620, cy: 240 }, { cx: 80, cy: 340 }, { cx: 760, cy: 100 },
];
const SVG_EDGES = [
  [0,1],[1,2],[2,3],[1,4],[4,5],[5,6],[3,6],[0,4],[2,5],[6,8],[7,4],[1,8],
];

function FinalCTASection() {
  const navigate = useNavigate();

  return (
    <>
      <section className="fcta-section">
        <svg className="fcta-bg-svg" viewBox="0 0 840 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {SVG_EDGES.map(([a, b], i) => (
            <line key={i}
              x1={SVG_NODES[a].cx} y1={SVG_NODES[a].cy}
              x2={SVG_NODES[b].cx} y2={SVG_NODES[b].cy}
              stroke="#9E3028" strokeWidth="1"
            />
          ))}
          {SVG_NODES.map((n, i) => (
            <circle key={i} cx={n.cx} cy={n.cy} r="5" fill="#9E3028" />
          ))}
        </svg>

        <div className="fcta-content">
          <h2 className="fcta-headline">
            <span className="fcta-see">See</span>
            <span className="fcta-rest"> what your AI is doing.</span>
          </h2>
          <p className="fcta-subline">Connect your first agent in under a minute. No setup. No lock-in.</p>
          <button className="fcta-cta-btn" onClick={() => navigate('/signup')}>
            Start Building Free
          </button>
          <p className="fcta-trust">No credit card required · Anonymous session · Upgrade when ready</p>
        </div>
      </section>

      <footer className="fcta-footer">
        <div className="fcta-footer-inner">
          <div className="fcta-footer-col">
            <FlowfexLogo size={24} />
            <span className="fcta-footer-brand">Flowfex</span>
            <p className="fcta-footer-tagline">Visual AI orchestration for every agent.</p>
          </div>
          <div className="fcta-footer-col fcta-footer-nav">
            {['Product', 'Docs', 'Pricing', 'Blog'].map(l => (
              <a key={l} href="#" className="fcta-footer-link">{l}</a>
            ))}
          </div>
          <div className="fcta-footer-col fcta-footer-nav">
            {['GitHub', 'Twitter', 'Terms', 'Privacy'].map(l => (
              <a key={l} href="#" className="fcta-footer-link">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}

export default FinalCTASection;
