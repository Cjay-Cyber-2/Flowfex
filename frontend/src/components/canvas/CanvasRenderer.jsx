import React, { useEffect, useRef, useState } from 'react';
import useStore from '../../store/useStore';
import './CanvasRenderer.css';

function CanvasRenderer() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { canvasMode, nodes, edges, setSelectedNode, setRightDrawerOpen, isExecuting } = useStore();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sample nodes for demo
  const sampleNodes = [
    { id: 'node-1', x: 200, y: 150, width: 48, height: 48, state: 'completed', name: 'Input', type: 'input', icon: '📥' },
    { id: 'node-2', x: 350, y: 120, width: 44, height: 44, state: 'active', name: 'Analyzer', type: 'tool', icon: '🔍' },
    { id: 'node-3', x: 500, y: 200, width: 48, height: 48, state: 'active', name: 'Processor', type: 'tool', icon: '⚙️' },
    { id: 'node-4', x: 650, y: 150, width: 44, height: 44, state: 'queued', name: 'Validator', type: 'tool', icon: '✓' },
    { id: 'node-5', x: 350, y: 280, width: 44, height: 44, state: 'queued', name: 'Formatter', type: 'tool', icon: '📝' },
    { id: 'node-6', x: 800, y: 200, width: 48, height: 48, state: 'idle', name: 'Output', type: 'output', icon: '📤' }
  ];

  const sampleEdges = [
    { from: 'node-1', to: 'node-2' },
    { from: 'node-2', to: 'node-3' },
    { from: 'node-3', to: 'node-4' },
    { from: 'node-2', to: 'node-5' },
    { from: 'node-4', to: 'node-6' },
    { from: 'node-5', to: 'node-6' }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    let animationId;
    let time = 0;

    const animate = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Clear
      ctx.fillStyle = '#16161D';
      ctx.fillRect(0, 0, w, h);

      // Draw grid dots
      ctx.fillStyle = 'rgba(122, 106, 92, 0.08)';
      for (let x = 0; x < w; x += 40) {
        for (let y = 0; y < h; y += 40) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      time += 0.016;

      // Apply transform
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // Draw edges
      sampleEdges.forEach(edge => {
        const fromNode = sampleNodes.find(n => n.id === edge.from);
        const toNode = sampleNodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const fx = fromNode.x;
        const fy = fromNode.y;
        const tx = toNode.x;
        const ty = toNode.y;
        const cx = (fx + tx) / 2;
        const cy = (fy + ty) / 2 - 30;

        // Edge path
        ctx.strokeStyle = 'rgba(122, 106, 92, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(cx, cy, tx, ty);
        ctx.stroke();

        // Particles on active edges
        if (isExecuting && (fromNode.state === 'active' || toNode.state === 'active')) {
          for (let i = 0; i < 3; i++) {
            const progress = ((time * 0.3 + i * 0.33) % 1);
            const t = progress;
            const px = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * cx + t * t * tx;
            const py = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * cy + t * t * ty;

            ctx.fillStyle = '#D4A840';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.ellipse(px, py, 4, 1.5, Math.atan2(ty - fy, tx - fx), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      });

      // Draw nodes
      sampleNodes.forEach((node, i) => {
        const x = node.x;
        const y = node.y;
        const w = node.width;
        const h = node.height;

        // Idle drift
        const driftX = Math.sin(time * 0.5 + i) * 2;
        const driftY = Math.cos(time * 0.7 + i) * 2;
        const nx = x + driftX;
        const ny = y + driftY;

        // State colors
        const stateColors = {
          idle: '#7A6A5C',
          queued: '#8B5B38',
          active: '#9E3028',
          completed: '#3D7A6A',
          error: '#C23028'
        };

        const color = stateColors[node.state] || stateColors.idle;
        const radius = 14; // --radius-node

        // Glow for active nodes
        if (node.state === 'active') {
          const glowSize = 6 + Math.sin(time * 2 + i) * 4;
          ctx.fillStyle = 'rgba(158, 48, 40, 0.2)';
          ctx.beginPath();
          ctx.roundRect(nx - w/2 - glowSize, ny - h/2 - glowSize, w + glowSize*2, h + glowSize*2, radius + glowSize);
          ctx.fill();
        }

        // Node body (rounded rectangle)
        ctx.fillStyle = '#1C1812';
        ctx.strokeStyle = color;
        ctx.lineWidth = node.state === 'active' ? 2 : 1.5;
        ctx.beginPath();
        ctx.roundRect(nx - w/2, ny - h/2, w, h, radius);
        ctx.fill();
        ctx.stroke();

        // Node icon
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#EDE8DF';
        ctx.fillText(node.icon, nx, ny);

        // Node label
        ctx.font = '500 13px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#EDE8DF';
        ctx.fillText(node.name, nx, ny + h/2 + 18);
      });

      ctx.restore();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [transform, canvasMode, isExecuting]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;

    // Check if clicked on a node (rectangle bounds)
    const clickedNode = sampleNodes.find(node => {
      const halfW = node.width / 2;
      const halfH = node.height / 2;
      return x >= node.x - halfW && x <= node.x + halfW &&
             y >= node.y - halfH && y <= node.y + halfH;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setRightDrawerOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="canvas-renderer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} />
      
      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="canvas-empty-state">
          <div className="empty-state-content">
            <h2>Ready to orchestrate.</h2>
            <p>Connect an agent or start a session.</p>
            <div className="empty-state-actions">
              <button className="btn-ghost">Connect Agent</button>
              <button className="btn-ghost">Try Demo Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CanvasRenderer;
