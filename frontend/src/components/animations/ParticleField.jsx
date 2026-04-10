// ParticleField.jsx - 3D Particle System for Hero Background
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function ParticleHelix({ count = 300, mouse }) {
  const points = useRef();
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Double helix formation
      const t = (i / count) * Math.PI * 4;
      const radius = 2;
      const x = Math.cos(t) * radius + (Math.random() - 0.5) * 0.3;
      const y = (i / count) * 10 - 5;
      const z = Math.sin(t) * radius + (Math.random() - 0.5) * 0.3;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Color variation (Sinoper, Massicot, Verdigris)
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i * 3] = 0.62; colors[i * 3 + 1] = 0.19; colors[i * 3 + 2] = 0.16; // Sinoper
      } else if (colorChoice < 0.66) {
        colors[i * 3] = 0.77; colors[i * 3 + 1] = 0.58; colors[i * 3 + 2] = 0.19; // Massicot
      } else {
        colors[i * 3] = 0.24; colors[i * 3 + 1] = 0.48; colors[i * 3 + 2] = 0.42; // Verdigris
      }
    }
    
    return { positions, colors };
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      // Slow rotation
      points.current.rotation.y += 0.0005;
      
      // Mouse parallax
      points.current.rotation.x = mouse.y * 0.1;
      points.current.rotation.z = mouse.x * 0.05;
      
      // Scroll-based dispersion
      const scroll = window.scrollY / window.innerHeight;
      points.current.scale.setScalar(1 + scroll * 2);
      points.current.material.opacity = Math.max(0, 1 - scroll * 1.5);
    }
  });

  return (
    <Points ref={points} positions={particlesPosition.positions} colors={particlesPosition.colors}>
      <PointMaterial
        transparent
        vertexColors
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function ConnectionLines({ count = 300, positions }) {
  const lines = useRef();
  
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const linePositions = [];
    
    // Connect nearby particles
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const x1 = positions[i * 3];
        const y1 = positions[i * 3 + 1];
        const z1 = positions[i * 3 + 2];
        const x2 = positions[j * 3];
        const y2 = positions[j * 3 + 1];
        const z2 = positions[j * 3 + 2];
        
        const distance = Math.sqrt(
          Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
        );
        
        if (distance < 0.8) {
          linePositions.push(x1, y1, z1, x2, y2, z2);
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    return geometry;
  }, [count, positions]);

  return (
    <lineSegments ref={lines} geometry={lineGeometry}>
      <lineBasicMaterial
        color="#9E3028"
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

export default function ParticleField() {
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.35,
      transition: 'opacity 3s ease-out',
      pointerEvents: 'none'
    }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <ParticleHelix count={300} mouse={mouse} />
      </Canvas>
    </div>
  );
}
