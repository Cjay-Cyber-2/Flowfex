import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import useCanvasStore from '../../store/canvasStore';
import Node from './Node';
import Edge from './Edge';
import CanvasToolbar from './CanvasToolbar';
import Minimap from './Minimap';
import './CanvasContainer.css';

/**
 * CanvasContainer - The soul of Flowfex
 * 
 * A 5-layer rendering system that makes AI orchestration visible:
 * Layer 1: Base void (#080C10)
 * Layer 2: Dot grid texture (fixed, doesn't zoom)
 * Layer 3: Ambient depth gradient (conditional on agent active)
 * Layer 4: Graph rendering (pannable/zoomable)
 * Layer 5: UI overlays (fixed viewport position)
 */
function CanvasContainer({ nodes = [], edges = [], isAgentActive = false }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  
  // Canvas state from store
  const {
    viewport,
    selectedNodes,
    activeTool,
    updateViewport,
    selectNode,
    deselectAll,
    addToSelection,
  } = useCanvasStore();

  // Local interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState(null);
  
  // Motion values for smooth animations
  const panX = useMotionValue(viewport.panX);
  const panY = useMotionValue(viewport.panY);
  const zoom = useMotionValue(viewport.zoom);

  // Update motion values when viewport changes
  useEffect(() => {
    panX.set(viewport.panX);
    panY.set(viewport.panY);
    zoom.set(viewport.zoom);
  }, [viewport, panX, panY, zoom]);

  // Pan interaction handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left click
    
    const isSpacePressed = e.nativeEvent.getModifierState?.('Space') || activeTool === 'pan';
    
    if (isSpacePressed || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
      e.preventDefault();
    } else if (activeTool === 'select' && e.target === canvasRef.current) {
      // Start selection rectangle
      const rect = canvasRef.current.getBoundingClientRect();
      setSelectionRect({
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top,
      });
    }
  }, [activeTool, viewport.panX, viewport.panY]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      updateViewport({ panX: newPanX, panY: newPanY });
    } else if (selectionRect) {
      const rect = canvasRef.current.getBoundingClientRect();
      setSelectionRect(prev => ({
        ...prev,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top,
      }));
    }
  }, [isPanning, panStart, selectionRect, updateViewport]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      // Add momentum-based inertia
      setIsPanning(false);
    } else if (selectionRect) {
      // Select nodes within rectangle
      const rect = canvasRef.current.getBoundingClientRect();
      const minX = Math.min(selectionRect.startX, selectionRect.currentX);
      const maxX = Math.max(selectionRect.startX, selectionRect.currentX);
      const minY = Math.min(selectionRect.startY, selectionRect.currentY);
      const maxY = Math.max(selectionRect.startY, selectionRect.currentY);
      
      const selectedNodeIds = nodes
        .filter(node => {
          const nodeX = node.x * viewport.zoom + viewport.panX;
          const nodeY = node.y * viewport.zoom + viewport.panY;
          return nodeX >= minX && nodeX <= maxX && nodeY >= minY && nodeY <= maxY;
        })
        .map(node => node.id);
      
      if (e.shiftKey) {
        selectedNodeIds.forEach(id => addToSelection(id));
      } else {
        if (selectedNodeIds.length > 0) {
          selectNode(selectedNodeIds[0]);
        }
      }
      
      setSelectionRect(null);
    } else if (e.target === canvasRef.current) {
      // Click on empty canvas - deselect all
      deselectAll();
    }
  }, [isPanning, selectionRect, nodes, viewport, selectNode, addToSelection, deselectAll]);

  // Zoom interaction handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    const delta = e.deltaY;
    const zoomFactor = delta > 0 ? 0.95 : 1.05;
    const newZoom = Math.max(0.3, Math.min(2.0, viewport.zoom * zoomFactor));
    
    // Cursor-centered zoom
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - viewport.panX) / viewport.zoom;
    const worldY = (mouseY - viewport.panY) / viewport.zoom;
    
    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;
    
    updateViewport({ zoom: newZoom, panX: newPanX, panY: newPanY });
  }, [viewport, updateViewport]);

  // Fit to view function
  const fitToView = useCallback(() => {
    if (nodes.length === 0) return;
    
    const padding = 100;
    const minX = Math.min(...nodes.map(n => n.x)) - padding;
    const maxX = Math.max(...nodes.map(n => n.x + (n.width || 160))) + padding;
    const minY = Math.min(...nodes.map(n => n.y)) - padding;
    const maxY = Math.max(...nodes.map(n => n.y + (n.height || 72))) + padding;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    const zoomX = canvasWidth / graphWidth;
    const zoomY = canvasHeight / graphHeight;
    const newZoom = Math.min(zoomX, zoomY, 1.0);
    
    const newPanX = (canvasWidth - graphWidth * newZoom) / 2 - minX * newZoom;
    const newPanY = (canvasHeight - graphHeight * newZoom) / 2 - minY * newZoom;
    
    updateViewport({ zoom: newZoom, panX: newPanX, panY: newPanY });
  }, [nodes, updateViewport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        deselectAll();
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        fitToView();
      }

      if (e.key === 'm' || e.key === 'M') {
        // Switch to Map mode
      }
      if (e.key === 'f' || e.key === 'F') {
        // Switch to Flow mode
      }
      if (e.key === 'l' || e.key === 'L') {
        // Switch to Live mode
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deselectAll, fitToView]);

  // Cursor style based on interaction state
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (activeTool === 'pan') return 'grab';
    if (selectionRect) return 'crosshair';
    return 'default';
  };

  return (
    <div 
      ref={canvasRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: getCursorStyle() }}
    >
      {/* Layer 1: Base Fill */}
      <div className="canvas-layer canvas-base" />
      
      {/* Layer 2: Dot Grid Texture */}
      <div className="canvas-layer canvas-dot-grid" />
      
      {/* Layer 3: Ambient Depth Gradient */}
      {isAgentActive && (
        <motion.div 
          className="canvas-layer canvas-ambient-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}
      
      {/* Layer 4: Graph Rendering */}
      <motion.div
        ref={graphRef}
        className="canvas-layer canvas-graph"
        style={{
          transform: useTransform(
            [panX, panY, zoom],
            ([x, y, z]) => `translate(${x}px, ${y}px) scale(${z})`
          ),
          transformOrigin: '0 0',
        }}
      >
        {/* Render edges first (behind nodes) */}
        <svg className="canvas-edges">
          <defs>
            {/* Arrowhead markers */}
            <marker
              id="arrowhead-inactive"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(232, 237, 242, 0.12)" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0, 229, 195, 1.0)" />
            </marker>
            <marker
              id="arrowhead-completed"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0, 229, 195, 0.22)" />
            </marker>
          </defs>
          
          {edges.map(edge => (
            <Edge
              key={edge.id}
              edge={edge}
              nodes={nodes}
              zoom={viewport.zoom}
            />
          ))}
        </svg>
        
        {/* Render nodes */}
        <div className="canvas-nodes">
          {nodes.map(node => (
            <Node
              key={node.id}
              node={node}
              isSelected={selectedNodes.includes(node.id)}
              zoom={viewport.zoom}
              onSelect={() => selectNode(node.id)}
            />
          ))}
        </div>
      </motion.div>
      
      {/* Selection rectangle */}
      {selectionRect && (
        <div
          className="canvas-selection-rect"
          style={{
            left: Math.min(selectionRect.startX, selectionRect.currentX),
            top: Math.min(selectionRect.startY, selectionRect.currentY),
            width: Math.abs(selectionRect.currentX - selectionRect.startX),
            height: Math.abs(selectionRect.currentY - selectionRect.startY),
          }}
        />
      )}
      
      {/* Layer 5: UI Overlays */}
      <CanvasToolbar onFitToView={fitToView} />
      <Minimap nodes={nodes} edges={edges} viewport={viewport} />
    </div>
  );
}

export default CanvasContainer;
