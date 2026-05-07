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
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
    if (!gl) return;

    const vert = `attribute vec2 aPosition; void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
    const frag = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      mat2 rotate2d(float angle){ float c=cos(angle),s=sin(angle); return mat2(c,-s,s,c); }
      float variation(vec2 v1,vec2 v2,float strength,float speed){
        return sin(dot(normalize(v1),normalize(v2))*strength+iTime*speed)/120.0;
      }
      float paintCircle(vec2 uv,vec2 center,float rad,float width){
        vec2 diff=center-uv;
        float len=length(diff);
        len+=variation(diff,vec2(0.,1.),5.,1.6);
        len-=variation(diff,vec2(1.,0.),5.,1.6);
        return smoothstep(rad-width,rad,len)-smoothstep(rad,rad+width,len);
      }
      void main(){
        // Square aspect: keep the circle perfectly round even when the
        // canvas size flexes with the viewport.
        float minDim = min(iResolution.x, iResolution.y);
        vec2 uv = (gl_FragCoord.xy - 0.5*iResolution.xy) / minDim + vec2(0.5);
        float mask = 0.0;
        float radius = .34;
        vec2 center = vec2(.5);
        mask += paintCircle(uv,center,radius,.03);
        mask += paintCircle(uv,center,radius-.018,.008);
        mask += paintCircle(uv,center,radius+.018,.004);

        vec2 v = rotate2d(iTime*0.6)*(uv-center);
        // Flowfex teal/cyan/aqua palette so the canvas relates to the rest of
        // the webapp instead of pure black + white.
        vec3 cTeal   = vec3(0.0,  0.83, 0.66);
        vec3 cAqua   = vec3(0.50, 1.00, 0.94);
        vec3 cCyan   = vec3(0.0,  0.71, 0.81);
        vec3 fg = mix(cTeal, cAqua, smoothstep(-0.4, 0.4, v.y));
        fg     = mix(fg,    cCyan, smoothstep(-0.4, 0.4, v.x));

        // Match the dark eigengrau body color so the canvas never reads as a
        // pure black square that obstructs surrounding text.
        vec3 bg = vec3(0.031, 0.047, 0.062);
        float ringInner = paintCircle(uv,center,radius,.0025);
        vec3 color = mix(bg, fg, mask);
        color = mix(color, vec3(0.85, 1.0, 0.96), ringInner);
        gl_FragColor = vec4(color, 1.0);
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

    // Lock the WebGL drawing buffer to a stable size derived from the wrapper
    // ONCE per resize event, so the canvas no longer fluctuates between paints.
    let raf;
    let lastWidth = 0;
    let lastHeight = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      gl.viewport(0, 0, width, height);
    };

    const render = (t) => {
      gl.uniform1f(iTimeLoc, t * 0.001);
      gl.uniform2f(iResLoc, lastWidth || canvas.width, lastHeight || canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };

    resize();
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(wrap);
    } else {
      window.addEventListener('resize', resize);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', resize);
      }
    };
  }, []);

  return (
    <div ref={wrapRef} className="mps-shader-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="mps-shader-canvas" />
      <div className="mps-shader-overlay" />
    </div>
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
