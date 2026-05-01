import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useCanvasStore from '../../store/canvasStore';
import './Minimap.css';

/**
 * Minimap - Bird's eye view of the graph
 * 
 * Shows simplified graph with viewport indicator
 */
function Minimap({ nodes = [], edges = [], viewport }) {
  const { minimapVisible, updateViewport } = useCanvasStore();
  const minimapRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate graph bounds
  const bounds = calculateGraphBounds(nodes);
  
  // Minimap dimensions
  const minimapWidth = 180;
  const minimapHeight = 120;
  
  // Calculate scale to fit graph in minimap
  const scaleX = minimapWidth / (bounds.maxX - bounds.minX + 200);
  const scaleY = minimapHeight / (bounds.maxY - bounds.minY + 200);
  const scale = Math.min(scaleX, scaleY, 1);

  // Transform node positions to minimap space
  const transformToMinimap = (x, y) => ({
    x: (x - bounds.minX + 100) * scale,
    y: (y - bounds.minY + 100) * scale,
  });

  // Calculate viewport rectangle in minimap space
  const viewportRect = calculateViewportRect(viewport, bounds, scale, minimapWidth, minimapHeight);

  // Handle viewport drag
  const handleViewportMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap coordinates back to canvas coordinates
    const canvasX = (x / scale + bounds.minX - 100) * viewport.zoom;
    const canvasY = (y / scale + bounds.minY - 100) * viewport.zoom;

    // Update viewport to center on clicked position
    const newPanX = -canvasX + window.innerWidth / 2;
    const newPanY = -canvasY + window.innerHeight / 2;

    updateViewport({ panX: newPanX, panY: newPanY });
  }, [bounds.minX, bounds.minY, isDragging, scale, updateViewport, viewport.zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDragging]);

  if (!minimapVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={minimapRef}
        className="minimap"
        initial={{ opacity: 0, scale: 0.9, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <svg
          width={minimapWidth}
          height={minimapHeight}
          viewBox={`0 0 ${minimapWidth} ${minimapHeight}`}
          className="minimap-svg"
        >
          {/* Render edges */}
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.from);
            const targetNode = nodes.find(n => n.id === edge.to);
            
            if (!sourceNode || !targetNode) return null;

            const start = transformToMinimap(
              sourceNode.x + (sourceNode.width || 160) / 2,
              sourceNode.y + (sourceNode.height || 72) / 2
            );
            const end = transformToMinimap(
              targetNode.x + (targetNode.width || 160) / 2,
              targetNode.y + (targetNode.height || 72) / 2
            );

            return (
              <line
                key={edge.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className={`minimap-edge minimap-edge-${edge.state}`}
              />
            );
          })}

          {/* Render nodes */}
          {nodes.map(node => {
            const pos = transformToMinimap(node.x, node.y);
            
            return (
              <rect
                key={node.id}
                x={pos.x}
                y={pos.y}
                width={4}
                height={3}
                rx={1}
                className={`minimap-node minimap-node-${node.state}`}
              />
            );
          })}

          {/* Viewport indicator */}
          <rect
            x={viewportRect.x}
            y={viewportRect.y}
            width={viewportRect.width}
            height={viewportRect.height}
            className="minimap-viewport"
            onMouseDown={handleViewportMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        </svg>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Calculate graph bounding box
 */
function calculateGraphBounds(nodes) {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  }

  const minX = Math.min(...nodes.map(n => n.x));
  const maxX = Math.max(...nodes.map(n => n.x + (n.width || 160)));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxY = Math.max(...nodes.map(n => n.y + (n.height || 72)));

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate viewport rectangle in minimap space
 */
function calculateViewportRect(viewport, bounds, scale, minimapWidth, minimapHeight) {
  // This is a simplified calculation
  // In production, you'd need to account for the actual canvas dimensions
  const canvasWidth = window.innerWidth - 576; // Minus panels
  const canvasHeight = window.innerHeight - 64; // Minus top bar

  const viewportWidth = (canvasWidth / viewport.zoom) * scale;
  const viewportHeight = (canvasHeight / viewport.zoom) * scale;

  const viewportX = (-viewport.panX / viewport.zoom - bounds.minX + 100) * scale;
  const viewportY = (-viewport.panY / viewport.zoom - bounds.minY + 100) * scale;

  return {
    x: Math.max(0, Math.min(viewportX, minimapWidth - viewportWidth)),
    y: Math.max(0, Math.min(viewportY, minimapHeight - viewportHeight)),
    width: Math.min(viewportWidth, minimapWidth),
    height: Math.min(viewportHeight, minimapHeight),
  };
}

export default Minimap;
