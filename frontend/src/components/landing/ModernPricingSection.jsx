/**
 * ModernPricingSection — glassmorphic pricing cards with WebGL shader background.
 * Adapted from the provided TypeScript component to plain JSX.
 * Replaces the previous PricingSection component.
 */
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── WebGL Shader Background ──────────────────────────────────────────────────

function ShaderCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vert = `attribute vec2 aPosition; void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
    const frag = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      mat2 rotate2d(float angle){ float c=cos(angle),s=sin(angle); return mat2(c,-s,s,c); }
      float variation(vec2 v1,vec2 v2,float strength,float speed){ return sin(dot(normalize(v1),normalize(v2))*strength+iTime*speed)/100.0; }
      vec3 paintCircle(vec2 uv,vec2 center,float rad,float width){
        vec2 diff=center-uv;
        float len=length(diff);
        len+=variation(diff,vec2(0.,1.),5.,2.);
        len-=variation(diff,vec2(1.,0.),5.,2.);
        float circle=smoothstep(rad-width,rad,len)-smoothstep(rad,rad+width,len);
        return vec3(circle);
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/iResolution.xy;
        uv.x*=1.5; uv.x-=0.25;
        float mask=0.0;
        float radius=.35;
        vec2 center=vec2(.5);
        mask+=paintCircle(uv,center,radius,.035).r;
        mask+=paintCircle(uv,center,radius-.018,.01).r;
        mask+=paintCircle(uv,center,radius+.018,.005).r;
        vec2 v=rotate2d(iTime)*uv;
        vec3 fg=vec3(v.x*0.2,v.y*0.6+0.4,.7-v.y*v.x);
        vec3 bg=vec3(0.04,0.05,0.08);
        vec3 color=mix(bg,fg,mask);
        color=mix(color,vec3(1.),paintCircle(uv,center,radius,.003).r);
        gl_FragColor=vec4(color,1.);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const iTimeLoc = gl.getUniformLocation(prog, 'iTime');
    const iResLoc = gl.getUniformLocation(prog, 'iResolution');

    let raf;
    const render = (t) => {
      gl.uniform1f(iTimeLoc, t * 0.001);
      gl.uniform2f(iResLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 0 }}
    />
  );
}

// ─── Check icon ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────

function ModernPricingCard({ planName, description, price, features, buttonText, isPopular = false, onCta }) {
  return (
    <div className={`mpc-card ${isPopular ? 'mpc-card-popular' : ''}`}>
      {isPopular && <div className="mpc-badge">Most Popular</div>}
      <div className="mpc-header">
        <h2 className="mpc-plan-name">{planName}</h2>
        <p className="mpc-description">{description}</p>
      </div>
      <div className="mpc-price">
        <span className="mpc-price-amount">${price}</span>
        <span className="mpc-price-period">/mo</span>
      </div>
      <div className="mpc-divider" />
      <ul className="mpc-features">
        {features.map((f, i) => (
          <li key={i} className="mpc-feature-item">
            <span className="mpc-check"><CheckIcon /></span>
            {f}
          </li>
        ))}
      </ul>
      <button
        className={`mpc-button ${isPopular ? 'mpc-button-primary' : 'mpc-button-secondary'}`}
        onClick={onCta}
      >
        {buttonText}
      </button>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

const PLANS = [
  {
    planName: 'Free',
    description: 'Perfect for exploring Flowfex and running your first live sessions.',
    price: '0',
    features: [
      '1 active session',
      '3 connected agents',
      '100 execution steps/day',
      'Skill library (basic)',
      'Community support',
    ],
    buttonText: 'Start Free',
    isPopular: false,
  },
  {
    planName: 'Pro',
    description: 'For teams running production orchestration with full control.',
    price: '29',
    features: [
      'Unlimited sessions',
      '20 connected agents',
      '10,000 execution steps/day',
      'Full skill library + custom skills',
      'Approval workflows',
      'Priority support',
    ],
    buttonText: 'Get Pro',
    isPopular: true,
  },
  {
    planName: 'Teams',
    description: 'Shared control surfaces, audit logs, and multi-user approval queues.',
    price: '99',
    features: [
      'Everything in Pro',
      'Unlimited agents',
      'Team approval queues',
      'Audit logs & session replay',
      'SSO + RBAC',
      'Dedicated support',
    ],
    buttonText: 'Contact Sales',
    isPopular: false,
  },
];

function ModernPricingSection() {
  const navigate = useNavigate();
  return (
    <section id="pricing" data-section-id="pricing" className="mps-root">
      <ShaderCanvas />
      <div className="mps-inner">
        <div className="mps-heading">
          <span className="section-kicker">PRICING</span>
          <h2 className="mps-title">Start free. Scale when you're ready.</h2>
          <p className="mps-subtitle">No forced sign-up. No credit card for trial access. Just orchestration.</p>
        </div>
        <div className="mps-cards">
          {PLANS.map((plan) => (
            <ModernPricingCard
              key={plan.planName}
              {...plan}
              onCta={() => navigate('/onboarding')}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ModernPricingSection;
