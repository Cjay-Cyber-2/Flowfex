import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import './Edge.css';

/**
 * Edge Component - The paths of intelligence flow
 * 
 * States: inactive, active, completed, rerouted
 * Features: cubic bezier curves, arrowheads, traveling pulse dots
 */
function Edge({ edge, nodes, zoom }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    id,
    from,
    to,
    state = 'inactive',
    label = null,
    condition = null, // For branch edges
  } = edge;

  // Find source and target nodes
  const sourceNode = nodes.find(n => n.id === from);
  const targetNode = nodes.find(n => n.id === to);

  if (!sourceNode || !targetNode) return null;

  // Calculate edge path
  const { path, midpoint, labelPosition } = useMemo(() => {
    return calculateEdgePath(sourceNode, targetNode);
  }, [sourceNode, targetNode]);

  // Get marker ID based on state
  const getMarkerId = () => {
    if (state === 'active' || state === 'executing') return 'arrowhead-active';
    if (state === 'completed') return 'arrowhead-completed';
    return 'arrowhead-inactive';
  };

  // Get edge class based on state
  const getEdgeClass = () => {
    return `edge edge-${state} ${isHovered ? 'edge-hovered' : ''}`;
  };

  // Handle hover
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Handle click
  const handleClick = (e) => {
    e.stopPropagation();
    // Open edge control popover
    console.log('Edge clicked:', id);
  };

  return (
    <g className="edge-group">
      {/* Main edge path */}
      <motion.path
        id={`edge-${id}`}
        d={path}
        className={getEdgeClass()}
        markerEnd={`url(#${getMarkerId()})`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Traveling pulse dot for active edges */}
      {(state === 'active' || state === 'executing') && (
        <g className="edge-pulse-container">
          <motion.circle
            className="edge-pulse-dot"
            r="4"
            fill="#00E5C3"
            filter="url(#pulse-glow)"
          >
            <animateMotion
              dur="1.2s"
              repeatCount="indefinite"
              path={path}
              rotate="auto"
            >
              <mpath href={`#edge-${id}`} />
            </animateMotion>
          </motion.circle>
        </g>
      )}

      {/* Branch condition label */}
      {condition && labelPosition && (
        <g transform={`translate(${labelPosition.x}, ${labelPosition.y})`}>
          <rect
            x="-30"
            y="-12"
            width="60"
            height="24"
            rx="8"
            className="edge-label-bg"
          />
          <text
            className="edge-label-text"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {condition}
          </text>
        </g>
      )}

      {/* Hover tooltip */}
      {isHovered && midpoint && (
        <g transform={`translate(${midpoint.x}, ${midpoint.y - 30})`}>
          <rect
            x="-60"
            y="-20"
            width="120"
            height="40"
            rx="8"
            className="edge-tooltip-bg"
          />
          <text
            className="edge-tooltip-text"
            textAnchor="middle"
            y="-5"
          >
            {sourceNode.title}
          </text>
          <text
            className="edge-tooltip-text edge-tooltip-arrow"
            textAnchor="middle"
            y="10"
          >
            ↓
          </text>
          <text
            className="edge-tooltip-text"
            textAnchor="middle"
            y="25"
          >
            {targetNode.title}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Calculate cubic bezier path between two nodes
 */
function calculateEdgePath(sourceNode, targetNode) {
  const sourceWidth = sourceNode.width || 160;
  const sourceHeight = sourceNode.height || 72;
  const targetWidth = targetNode.width || 160;
  const targetHeight = targetNode.height || 72;

  // Calculate node centers
  const sourceCenter = {
    x: sourceNode.x + sourceWidth / 2,
    y: sourceNode.y + sourceHeight / 2,
  };
  const targetCenter = {
    x: targetNode.x + targetWidth / 2,
    y: targetNode.y + targetHeight / 2,
  };

  // Calculate direction
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // Determine edge handles (exit/entry points)
  let start, end;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal flow
    if (dx >= 0) {
      // Left to right
      start = { x: sourceNode.x + sourceWidth, y: sourceCenter.y };
      end = { x: targetNode.x, y: targetCenter.y };
    } else {
      // Right to left
      start = { x: sourceNode.x, y: sourceCenter.y };
      end = { x: targetNode.x + targetWidth, y: targetCenter.y };
    }
  } else {
    // Vertical flow
    if (dy >= 0) {
      // Top to bottom
      start = { x: sourceCenter.x, y: sourceNode.y + sourceHeight };
      end = { x: targetCenter.x, y: targetNode.y };
    } else {
      // Bottom to top
      start = { x: sourceCenter.x, y: sourceNode.y };
      end = { x: targetCenter.x, y: targetNode.y + targetHeight };
    }
  }

  // Calculate control points for smooth curve
  const controlOffset = Math.max(120, Math.abs(dx) * 0.34, Math.abs(dy) * 0.4);
  
  let cp1, cp2;
  
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal curve
    const direction = dx >= 0 ? 1 : -1;
    cp1 = { x: start.x + controlOffset * direction, y: start.y };
    cp2 = { x: end.x - controlOffset * direction, y: end.y };
  } else {
    // Vertical curve
    const direction = dy >= 0 ? 1 : -1;
    cp1 = { x: start.x, y: start.y + controlOffset * direction };
    cp2 = { x: end.x, y: end.y - controlOffset * direction };
  }

  // Create SVG path
  const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

  // Calculate midpoint for labels
  const t = 0.5;
  const midpoint = {
    x: Math.pow(1-t, 3) * start.x + 3 * Math.pow(1-t, 2) * t * cp1.x + 3 * (1-t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * end.x,
    y: Math.pow(1-t, 3) * start.y + 3 * Math.pow(1-t, 2) * t * cp1.y + 3 * (1-t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * end.y,
  };

  // Calculate label position (closer to source)
  const labelT = 0.3;
  const labelPosition = {
    x: Math.pow(1-labelT, 3) * start.x + 3 * Math.pow(1-labelT, 2) * labelT * cp1.x + 3 * (1-labelT) * Math.pow(labelT, 2) * cp2.x + Math.pow(labelT, 3) * end.x,
    y: Math.pow(1-labelT, 3) * start.y + 3 * Math.pow(1-labelT, 2) * labelT * cp1.y + 3 * (1-labelT) * Math.pow(labelT, 2) * cp2.y + Math.pow(labelT, 3) * end.y - 18,
  };

  return { path, midpoint, labelPosition };
}

export default Edge;
