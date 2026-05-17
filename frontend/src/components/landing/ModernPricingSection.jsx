/**
 * ModernPricingSection — glassmorphic pricing cards with full-bleed WebGL background.
 */
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── WebGL Shader Background (full section, historical look) ────────────────

function ShaderCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
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
        vec3 fg=vec3(0.0, 0.83, 0.66) * (v.y * 0.6 + 0.4);
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
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
      const host = canvas.parentElement;
      const w = host?.clientWidth || 1;
      const h = host?.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);
    let ro;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="mps-shader-canvas-full" aria-hidden="true" />;
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
        type="button"
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
    description: 'Perfect for exploring Syn-IQ and running your first live sessions.',
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

function ModernPricingSection({ embedMode = false, embeddedCta }) {
  const navigate = useNavigate();
  const handlePlanCta = (planName) => {
    if (typeof embeddedCta === 'function') {
      embeddedCta(planName);
      return;
    }
    navigate('/app');
  };
  return (
    <section
      id={embedMode ? undefined : 'pricing'}
      data-section-id="pricing"
      className={`mps-root${embedMode ? ' mps-root--embed' : ''}`}
    >
      <div className="mps-shader-host">
        <ShaderCanvas />
      </div>
      <div className="mps-inner">
        {!embedMode ? (
          <div className="mps-heading">
            <h2 className="mps-title">Start free. Scale when you&apos;re ready.</h2>
            <p className="mps-subtitle">No forced sign-up. No credit card for trial access. Just orchestration.</p>
          </div>
        ) : (
          <div className="mps-heading mps-heading--embed">
            <h2 className="mps-title mps-title--embed">Choose a plan</h2>
            <p className="mps-subtitle">Upgrade to keep orchestrating today, or wait for your free quota to renew.</p>
          </div>
        )}
        <div className="mps-cards">
          {PLANS.map((plan) => (
            <ModernPricingCard
              key={plan.planName}
              {...plan}
              onCta={() => handlePlanCta(plan.planName)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ModernPricingSection;
