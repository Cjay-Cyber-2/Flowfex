/**
 * ModernPricingSection — Syniq-themed pricing with optional monthly/yearly toggle.
 */
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing/modern-pricing.css';

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

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function BillingToggle({ isYearly, onChange }) {
  return (
    <div className="mps-billing-toggle" role="group" aria-label="Billing period">
      <button
        type="button"
        className={`mps-billing-toggle__btn ${!isYearly ? 'is-active' : ''}`}
        onClick={() => onChange(false)}
      >
        Monthly
      </button>
      <button
        type="button"
        className={`mps-billing-toggle__btn ${isYearly ? 'is-active' : ''}`}
        onClick={() => onChange(true)}
      >
        Yearly
      </button>
    </div>
  );
}

function ModernPricingCard({
  planName,
  description,
  price,
  periodLabel,
  features,
  buttonText,
  isPopular = false,
  onCta,
}) {
  return (
    <div className={`mpc-card ${isPopular ? 'mpc-card-popular' : ''}`}>
      {isPopular ? <div className="mpc-badge">Most Popular</div> : null}
      <div className="mpc-header">
        <h2 className="mpc-plan-name">{planName}</h2>
        <p className="mpc-description">{description}</p>
      </div>
      <div className="mpc-price">
        <span className="mpc-price-amount">${price}</span>
        <span className="mpc-price-period">{periodLabel}</span>
      </div>
      <div className="mpc-divider" />
      <ul className="mpc-features">
        {features.map((feature) => (
          <li key={feature} className="mpc-feature-item">
            <span className="mpc-check"><CheckIcon /></span>
            {feature}
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

const PLANS = [
  {
    planName: 'Starter',
    description: 'Try Syniq with a connected agent and a rolling free quota (6 skill or tool pulls per window).',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '15 guest Syniq skill or tool requests per 5-hour window (sign in to save your workspace; Pro required to continue)',
      '1 connected agent',
      'Prompt, link, SDK, and live attach',
      'Map and Flow supervision',
      'Community support',
    ],
    buttonText: 'Continue on free tier',
    isPopular: false,
  },
  {
    planName: 'Business',
    description: 'Production orchestration for builders who need uninterrupted Syniq pulls and more agents.',
    monthlyPrice: 48,
    yearlyPrice: 399,
    features: [
      'Unlimited Syniq skill and tool requests',
      'Multiple connected agents',
      'Full skill library and custom skills',
      'Approval workflows and live reroutes',
      'Priority support',
    ],
    buttonText: 'Upgrade to Pro',
    isPopular: true,
  },
  {
    planName: 'Enterprise',
    description: 'Shared control surfaces, auditability, and security for larger teams.',
    monthlyPrice: 96,
    yearlyPrice: 899,
    features: [
      'Everything in Business',
      'Team approval queues',
      'Audit logs and session replay',
      'SSO and role-based access',
      'Dedicated support and SLA options',
    ],
    buttonText: 'Contact sales',
    isPopular: false,
  },
];

function ModernPricingSection({
  embedMode = false,
  embeddedCta,
  showBillingToggle = false,
}) {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const handlePlanCta = (planName) => {
    if (typeof embeddedCta === 'function') {
      embeddedCta(planName);
      return;
    }
    navigate('/onboarding');
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
            <h2 className="mps-title">Plans that work best for your agents</h2>
            <p className="mps-subtitle">
              Trusted by teams orchestrating IDE, CLI, and web agents through one Syniq bridge.
            </p>
          </div>
        ) : (
          <div className="mps-heading mps-heading--embed">
            <h2 className="mps-title mps-title--embed">Choose a plan</h2>
            <p className="mps-subtitle">
              Upgrade for uninterrupted usage, or wait for your free quota to renew every 5 hours.
            </p>
          </div>
        )}

        {showBillingToggle || !embedMode ? (
          <BillingToggle isYearly={isYearly} onChange={setIsYearly} />
        ) : null}

        <div className="mps-cards">
          {PLANS.map((plan) => (
            <ModernPricingCard
              key={plan.planName}
              planName={plan.planName}
              description={plan.description}
              price={isYearly ? plan.yearlyPrice : plan.monthlyPrice}
              periodLabel={isYearly ? '/year' : '/month'}
              features={plan.features}
              buttonText={plan.buttonText}
              isPopular={plan.isPopular}
              onCta={() => handlePlanCta(plan.planName)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ModernPricingSection;
