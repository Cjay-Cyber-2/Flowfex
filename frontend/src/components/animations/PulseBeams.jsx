/**
 * PulseBeams — animated SVG beam paths with framer-motion gradient pulses.
 * Adapted from the provided TypeScript component to plain JSX.
 */
import React from 'react';
import { motion } from 'framer-motion';

export function PulseBeams({
  children,
  className = '',
  background,
  beams,
  width = 858,
  height = 434,
  baseColor = 'rgba(255,255,255,0.08)',
  accentColor = 'rgba(255,255,255,0.15)',
  gradientColors,
}) {
  return (
    <div
      className={`pulse-beams-root ${className}`}
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {background}
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <BeamSVG
          beams={beams}
          width={width}
          height={height}
          baseColor={baseColor}
          accentColor={accentColor}
          gradientColors={gradientColors}
        />
      </div>
    </div>
  );
}

function BeamSVG({ beams, width, height, baseColor, accentColor, gradientColors }) {
  const colors = gradientColors || {
    start: '#18CCFC',
    middle: '#6344F5',
    end: '#AE48FF',
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {beams.map((beam, index) => (
        <React.Fragment key={index}>
          {/* Static base path */}
          <path d={beam.path} stroke={baseColor} strokeWidth="1" />
          {/* Animated gradient overlay */}
          <path
            d={beam.path}
            stroke={`url(#grad${index})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Connection dots */}
          {beam.connectionPoints?.map((point, pi) => (
            <circle
              key={`${index}-${pi}`}
              cx={point.cx}
              cy={point.cy}
              r={point.r}
              fill={baseColor}
              stroke={accentColor}
            />
          ))}
        </React.Fragment>
      ))}

      <defs>
        {beams.map((beam, index) => (
          <motion.linearGradient
            key={index}
            id={`grad${index}`}
            gradientUnits="userSpaceOnUse"
            initial={beam.gradientConfig.initial}
            animate={beam.gradientConfig.animate}
            transition={beam.gradientConfig.transition}
          >
            <stop offset="0%" stopColor={colors.start} stopOpacity="0" />
            <stop offset="20%" stopColor={colors.start} stopOpacity="1" />
            <stop offset="50%" stopColor={colors.middle} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.end} stopOpacity="0" />
          </motion.linearGradient>
        ))}
      </defs>
    </svg>
  );
}

export default PulseBeams;
