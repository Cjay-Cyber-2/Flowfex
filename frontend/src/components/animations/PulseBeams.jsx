/**
 * PulseBeams — animated SVG beam paths with framer-motion gradient pulses.
 * Enhanced with "Connection Beam" logic for orchestration events.
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
    start: '#00D4AA', // Sinoper
    middle: '#E8B931', // Massicot
    end: '#46BDA9', // Verdigris
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

          {/* Animated gradient overlay (The Connection Beam) */}
          <motion.path
            d={beam.path}
            stroke={`url(#grad${index})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1],
              opacity: [0, 1, 0],
              transition: {
                duration: 3,
                repeat: Infinity,
                delay: index * 0.4,
                ease: "easeInOut"
              }
            }}
          />

          {/* Connection dots */}
          {beam.connectionPoints?.map((point, pi) => (
            <motion.circle
              key={`${index}-${pi}`}
              cx={point.cx}
              cy={point.cy}
              r={point.r}
              fill={baseColor}
              stroke={accentColor}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.4
              }}
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
            initial={beam.gradientConfig?.initial || { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }}
            animate={beam.gradientConfig?.animate}
            transition={beam.gradientConfig?.transition}
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
