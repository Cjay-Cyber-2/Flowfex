/**
 * CompletionBloom — a radial expansion effect that signals task completion.
 * Used at the end of orchestration flows to provide visual satisfaction.
 */
import React from 'react';
import { motion } from 'framer-motion';

export function CompletionBloom({ x, y, color = '#E8B931' }) {
  return (
    <div
      className="completion-bloom"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 50,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Primary expansion ring */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: `2px solid ${color}`,
          boxShadow: `0 0 30px ${color}`
        }}
      />

      {/* Secondary shimmer flare */}
      <motion.div
        initial={{ scale: 0, opacity: 1, rotate: 0 }}
        animate={{ scale: 2.5, opacity: 0, rotate: 45 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          filter: 'blur(10px)'
        }}
      />

      {/* Particle burst */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos(i * 45 * Math.PI / 180) * 80,
            y: Math.sin(i * 45 * Math.PI / 180) * 80,
            scale: 0,
            opacity: 0
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: color,
            top: '50%',
            left: '50%'
          }}
        />
      ))}
    </div>
  );
}

export default CompletionBloom;
