// FlowField.jsx - Living Orchestration Network Animation
// Represents FlowFex as the central control surface with energy flowing through connections
import React, { useEffect, useRef, useMemo } from 'react';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 212, b: 170 };
}

function lerpColor(color1, color2, t) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// Animated flow line that travels along a path
function FlowPath({ from, to, delay, duration, color, width = 2 }) {
  const pathRef = useRef(null);
  const gradientRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    const gradient = gradientRef.current;
    if (!path || !gradient) return;

    let animationFrame;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp + delay;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // Create flowing gradient effect
      const offset = progress * 100;
      gradient.setAttribute('x1', `${offset - 50}%`);
      gradient.setAttribute('x2', `${offset + 50}%`);
      gradient.setAttribute('y1', `${offset - 50}%`);
      gradient.setAttribute('y2', `${offset + 50}%`);

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [delay, duration]);

  const midX = (from.x + to.x) / 2 + (to.y - from.y) * 0.15;
  const midY = (from.y + to.y) / 2 + (from.x - to.x) * 0.15;

  return (
    <g>
      {/* Background path */}
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke="rgba(0, 212, 170, 0.08)"
        strokeWidth={width}
        strokeLinecap="round"
      />
      {/* Flowing energy path */}
      <path
        ref={pathRef}
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={`url(#flow-gradient-${color.replace('#', '')})`}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray="20 30"
      />
      <defs>
        <linearGradient id={`flow-gradient-${color.replace('#', '')}`} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="40%" stopColor={color} stopOpacity="0.3" />
          <stop offset="50%" stopColor={color} stopOpacity="0.9" />
          <stop offset="60%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  );
}

// Pulsing node representing an agent, skill, or tool
function FlowNode({ x, y, size = 40, pulseSpeed = 2, color = '#00D4AA', label, icon }) {
  const groupRef = useRef(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    let frame = 0;
    const animate = () => {
      frame++;
      const pulse = Math.sin(frame * 0.03 * pulseSpeed) * 0.15 + 1;
      const glow = Math.sin(frame * 0.02 * pulseSpeed + 1) * 0.3 + 0.5;

      group.style.transform = `scale(${pulse})`;
      group.style.filter = `drop-shadow(0 0 ${20 * glow}px ${color})`;

      requestAnimationFrame(animate);
    };

    const anim = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(anim);
  }, [pulseSpeed, color]);

  return (
    <g ref={groupRef} transform={`translate(${x - size/2}, ${y - size/2})`}>
      {/* Outer glow rings */}
      <circle
        cx={size/2}
        cy={size/2}
        r={size * 0.8}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.2"
      />
      <circle
        cx={size/2}
        cy={size/2}
        r={size * 0.6}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      {/* Core node */}
      <circle
        cx={size/2}
        cy={size/2}
        r={size * 0.35}
        fill={color}
        opacity="0.9"
      />
      {/* Inner bright core */}
      <circle
        cx={size/2}
        cy={size/2}
        r={size * 0.15}
        fill="#fff"
        opacity="0.8"
      />
      {label && (
        <text
          x={size/2}
          y={size + 18}
          textAnchor="middle"
          fill="rgba(232, 237, 242, 0.8)"
          fontSize="11"
          fontFamily="var(--font-inter)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// Floating data packets traveling along connections
function DataPacket({ from, to, delay, duration, size = 6, color = '#00D4AA' }) {
  const packetRef = useRef(null);

  useEffect(() => {
    const packet = packetRef.current;
    if (!packet) return;

    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp + delay;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;

      // Ease in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;

      packet.setAttribute('cx', x);
      packet.setAttribute('cy', y);
      packet.setAttribute('r', size * (0.5 + Math.sin(progress * Math.PI) * 0.5));
      packet.setAttribute('opacity', 0.3 + Math.sin(progress * Math.PI) * 0.7);

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [delay, duration, from, to, size, color]);

  return (
    <circle
      ref={packetRef}
      r={size}
      fill={color}
      filter={`drop-shadow(0 0 8px ${color})`}
    />
  );
}

// Main FlowField component
export default function FlowField() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const interval = setInterval(updateDimensions, 2000);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearInterval(interval);
    };
  }, []);

  const { width, height } = dimensions;

  // Central FlowFex orchestration hub
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  // Agent entry points (left side)
  const agents = [
    { x: width * 0.15, y: height * 0.25, label: 'CLI Agent', color: '#E8EDF2' },
    { x: width * 0.12, y: height * 0.5, label: 'IDE Agent', color: '#7FEFDC' },
    { x: width * 0.18, y: height * 0.75, label: 'Web Agent', color: '#9E3028' },
  ];

  // Resource pools (right side)
  const resources = [
    { x: width * 0.85, y: height * 0.2, label: 'Skills', color: '#00D4AA' },
    { x: width * 0.88, y: height * 0.45, label: 'Tools', color: '#FFD700' },
    { x: width * 0.82, y: height * 0.65, label: 'Workflows', color: '#64DCFF' },
    { x: width * 0.75, y: height * 0.85, label: 'Memory', color: '#C780DD' },
  ];

  // Execution outputs (bottom)
  const outputs = [
    { x: width * 0.35, y: height * 0.92, label: 'Results', color: '#46BDA9' },
    { x: width * 0.65, y: height * 0.92, label: 'Actions', color: '#FF6B6B' },
  ];

  return (
    <svg
      ref={containerRef}
      className="flow-field-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible'
      }}
    >
      {/* Background gradient overlay */}
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(0, 212, 170, 0.08)" />
          <stop offset="50%" stopColor="rgba(0, 212, 170, 0.02)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        {/* Animated mesh gradient */}
        <linearGradient id="mesh-1" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0, 212, 170, 0.03)">
            <animate attributeName="stop-color" values="rgba(0, 212, 170, 0.03); rgba(127, 239, 220, 0.05); rgba(0, 212, 170, 0.03)" dur="8s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="rgba(127, 239, 220, 0.05)">
            <animate attributeName="stop-color" values="rgba(127, 239, 220, 0.05); rgba(0, 212, 170, 0.03); rgba(127, 239, 220, 0.05)" dur="8s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>

      {/* Subtle background mesh */}
      <rect x="0" y="0" width={width} height={height} fill="url(#hero-glow)" />

      {/* Connection lines from agents to FlowFex hub */}
      {agents.map((agent, i) => (
        <React.Fragment key={`agent-${i}`}>
          <FlowPath
            from={{ x: agent.x + 30, y: agent.y }}
            to={{ x: centerX - 60, y: centerY }}
            delay={i * 400}
            duration={2500}
            color={agent.color}
            width={2}
          />
          <DataPacket
            from={{ x: agent.x + 30, y: agent.y }}
            to={{ x: centerX - 60, y: centerY }}
            delay={i * 300 + 100}
            duration={2000}
            size={4}
            color={agent.color}
          />
        </React.Fragment>
      ))}

      {/* Connection lines from FlowFex hub to resources */}
      {resources.map((resource, i) => (
        <React.Fragment key={`resource-${i}`}>
          <FlowPath
            from={{ x: centerX + 60, y: centerY }}
            to={{ x: resource.x - 30, y: resource.y }}
            delay={i * 350 + 200}
            duration={2800}
            color={resource.color}
            width={2.5}
          />
          <DataPacket
            from={{ x: centerX + 60, y: centerY }}
            to={{ x: resource.x - 30, y: resource.y }}
            delay={i * 400 + 300}
            duration={2200}
            size={5}
            color={resource.color}
          />
        </React.Fragment>
      ))}

      {/* Connection lines from resources back to outputs */}
      {outputs.map((output, i) => (
        <React.Fragment key={`output-${i}`}>
          <FlowPath
            from={{ x: centerX, y: centerY + 60 }}
            to={{ x: output.x, y: output.y - 30 }}
            delay={i * 500}
            duration={3000}
            color={output.color}
            width={3}
          />
          <DataPacket
            from={{ x: centerX, y: centerY + 60 }}
            to={{ x: output.x, y: output.y - 30 }}
            delay={i * 600 + 400}
            duration={2500}
            size={6}
            color={output.color}
          />
        </React.Fragment>
      ))}

      {/* Central FlowFex Hub - larger, more prominent */}
      <g transform={`translate(${centerX}, ${centerY})`}>
        {/* Outer energy rings */}
        <circle r="80" fill="none" stroke="rgba(0, 212, 170, 0.15)" strokeWidth="2">
          <animate attributeName="r" values="75;85;75" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.1;0.2" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle r="60" fill="none" stroke="rgba(0, 212, 170, 0.25)" strokeWidth="2">
          <animate attributeName="r" values="55;65;55" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.15;0.3" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Core hub */}
        <circle r="45" fill="url(#hero-glow)" />
        <circle r="35" fill="rgba(0, 212, 170, 0.2)" />
        <circle r="25" fill="rgba(0, 212, 170, 0.4)" />
        <circle r="15" fill="rgba(0, 212, 170, 0.7)" />
        <circle r="8" fill="#fff" opacity="0.9" />

        {/* Hub label */}
        <text
          y="70"
          textAnchor="middle"
          fill="rgba(232, 237, 242, 0.95)"
          fontSize="13"
          fontFamily="var(--font-geist)"
          fontWeight="700"
          letterSpacing="0.1em"
          textTransform="uppercase"
        >
          FlowFex
        </text>
        <text
          y="86"
          textAnchor="middle"
          fill="rgba(0, 212, 170, 0.8)"
          fontSize="9"
          fontFamily="var(--font-inter)"
          letterSpacing="0.05em"
        >
          Orchestration Hub
        </text>
      </g>

      {/* Agent nodes */}
      {agents.map((agent, i) => (
        <FlowNode
          key={`agent-node-${i}`}
          x={agent.x}
          y={agent.y}
          size={50}
          pulseSpeed={1.5 + i * 0.3}
          color={agent.color}
          label={agent.label}
        />
      ))}

      {/* Resource nodes */}
      {resources.map((resource, i) => (
        <FlowNode
          key={`resource-node-${i}`}
          x={resource.x}
          y={resource.y}
          size={45}
          pulseSpeed={1.2 + i * 0.2}
          color={resource.color}
          label={resource.label}
        />
      ))}

      {/* Output nodes */}
      {outputs.map((output, i) => (
        <FlowNode
          key={`output-node-${i}`}
          x={output.x}
          y={output.y}
          size={40}
          pulseSpeed={1.8 + i * 0.1}
          color={output.color}
          label={output.label}
        />
      ))}

      {/* Ambient floating particles */}
      {[...Array(20)].map((_, i) => (
        <circle
          key={`particle-${i}`}
          r={2 + (i % 3)}
          fill="rgba(0, 212, 170, 0.3)"
        >
          <animate
            attributeName="cx"
            values={`${width * (0.1 + (i % 7) * 0.12)}; ${width * (0.2 + (i % 7) * 0.12)}; ${width * (0.1 + (i % 7) * 0.12)}`}
            dur={`${15 + i * 2}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values={`${height * (0.2 + Math.floor(i / 7) * 0.3)}; ${height * (0.5 + Math.floor(i / 7) * 0.1)}; ${height * (0.2 + Math.floor(i / 7) * 0.3)}`}
            dur={`${18 + i}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.2;0.5;0.2"
            dur={`${4 + (i % 3)}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
