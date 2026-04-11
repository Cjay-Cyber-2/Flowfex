import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Hand,
  Maximize,
  MessageSquarePlus,
  Minimize,
  Move,
  Scan,
  Target,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import useStore from '../../store/useStore';
import FlowIcon from '../common/FlowIcon';
import './CanvasRenderer.css';

const GRAPH_WIDTH = 2480;
const GRAPH_HEIGHT = 820;
const MIN_SCALE = 0.35;
const MAX_SCALE = 1.25;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getNodeDimensions(node) {
  return {
    width: node.width || 180,
    height: node.height || 96,
  };
}

function getNodeCenter(node) {
  const { width, height } = getNodeDimensions(node);
  return {
    x: node.x + width / 2,
    y: node.y + height / 2,
  };
}

function getEdgeAnchors(fromNode, toNode) {
  const from = getNodeDimensions(fromNode);
  const to = getNodeDimensions(toNode);
  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      start: {
        x: fromCenter.x + (dx >= 0 ? from.width / 2 : -from.width / 2),
        y: fromCenter.y,
      },
      end: {
        x: toCenter.x + (dx >= 0 ? -to.width / 2 : to.width / 2),
        y: toCenter.y,
      },
    };
  }

  return {
    start: {
      x: fromCenter.x,
      y: fromCenter.y + (dy >= 0 ? from.height / 2 : -from.height / 2),
    },
    end: {
      x: toCenter.x,
      y: toCenter.y + (dy >= 0 ? -to.height / 2 : to.height / 2),
    },
  };
}

function getEdgePath(fromNode, toNode) {
  const { start, end } = getEdgeAnchors(fromNode, toNode);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const controlOffset = Math.max(120, Math.abs(dx) * 0.34);
    const direction = dx >= 0 ? 1 : -1;

    return `M ${start.x} ${start.y} C ${start.x + controlOffset * direction} ${start.y}, ${
      end.x - controlOffset * direction
    } ${end.y}, ${end.x} ${end.y}`;
  }

  const controlOffset = Math.max(90, Math.abs(dy) * 0.4);
  const direction = dy >= 0 ? 1 : -1;

  return `M ${start.x} ${start.y} C ${start.x} ${start.y + controlOffset * direction}, ${end.x} ${
    end.y - controlOffset * direction
  }, ${end.x} ${end.y}`;
}

function getLabelPosition(fromNode, toNode) {
  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);

  return {
    x: fromCenter.x + (toCenter.x - fromCenter.x) * 0.3,
    y: fromCenter.y + (toCenter.y - fromCenter.y) * 0.3 - 18,
  };
}

function isNodeEmphasized(node, canvasMode) {
  if (canvasMode === 'map') return true;
  if (canvasMode === 'flow') return ['completed', 'active', 'approval', 'queued'].includes(node.state);
  return true;
}

function isEdgeEmphasized(edge, canvasMode) {
  if (canvasMode === 'map') return true;
  if (canvasMode === 'flow') return ['completed', 'active', 'queued', 'rerouted'].includes(edge.state);
  return true;
}

function CanvasRenderer() {
  const containerRef = useRef(null);
  const autoFitRef = useRef(false);
  const {
    canvasMode,
    edges,
    isExecuting,
    nodes,
    selectedNode,
    setCanvasMode,
    setSelectedNode,
    selectNode,
  } = useStore();
  const [transform, setTransform] = useState({ x: 120, y: 90, scale: 0.56 });
  const [dragState, setDragState] = useState(null);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 760 });
  const [toolMode, setToolMode] = useState('select');
  const [showMinimap, setShowMinimap] = useState(true);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const nodeMap = useMemo(
    () =>
      nodes.reduce((result, node) => {
        result[node.id] = node;
        return result;
      }, {}),
    [nodes]
  );

  useEffect(() => {
    const updateViewport = () => {
      if (!containerRef.current) return;
      setViewportSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const fitView = useCallback(() => {
    const padding = 80;
    const scale = clamp(
      Math.min(
        (viewportSize.width - padding * 2) / GRAPH_WIDTH,
        (viewportSize.height - padding * 2) / GRAPH_HEIGHT
      ),
      MIN_SCALE,
      MAX_SCALE
    );

    setTransform({
      scale,
      x: (viewportSize.width - GRAPH_WIDTH * scale) / 2,
      y: (viewportSize.height - GRAPH_HEIGHT * scale) / 2,
    });
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!nodes.length || autoFitRef.current || viewportSize.width === 0 || viewportSize.height === 0) return;
    fitView();
    autoFitRef.current = true;
  }, [fitView, nodes.length, viewportSize.width, viewportSize.height]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = document.activeElement?.tagName || '';
      const isTypingTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
      if (isTypingTarget) return;

      if (event.code === 'Space') {
        event.preventDefault();
        setSpacePressed(true);
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        fitView();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === 'm') setCanvasMode('map');
      if (key === 'f') setCanvasMode('flow');
      if (key === 'l') setCanvasMode('live');
      if (key === 'escape') {
        setSelectedNode(null);
        setHoveredEdge(null);
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [fitView, setCanvasMode, setSelectedNode]);

  const handleWheel = (event) => {
    event.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const nextScale = clamp(transform.scale * (event.deltaY < 0 ? 1.08 : 0.92), MIN_SCALE, MAX_SCALE);
    const worldX = (cursorX - transform.x) / transform.scale;
    const worldY = (cursorY - transform.y) / transform.scale;

    setTransform({
      scale: nextScale,
      x: cursorX - worldX * nextScale,
      y: cursorY - worldY * nextScale,
    });
  };

  const handleMouseDown = (event) => {
    const panActive = toolMode === 'pan' || spacePressed;
    if (!panActive) return;
    if (event.target.closest('[data-node-interactive="true"]')) return;

    setDragState({
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    });
  };

  const handleMouseMove = (event) => {
    if (!dragState) return;

    setTransform((current) => ({
      ...current,
      x: dragState.originX + (event.clientX - dragState.startX),
      y: dragState.originY + (event.clientY - dragState.startY),
    }));
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  const handleCanvasClick = (event) => {
    if (event.target.closest('[data-node-interactive="true"]')) return;
    if (event.target.closest('[data-edge-interactive="true"]')) return;
    setSelectedNode(null);
  };

  const updateHoveredEdge = (event, edge, fromNode, toNode) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setHoveredEdge({
      edgeId: edge.id,
      left: event.clientX - rect.left + 18,
      top: event.clientY - rect.top + 18,
      label: `${fromNode.title} → ${toNode.title}`,
      state: formatEdgeState(edge.state),
    });
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await containerRef.current.requestFullscreen();
  };

  const visibleWidth = viewportSize.width / transform.scale;
  const visibleHeight = viewportSize.height / transform.scale;
  const visibleX = -transform.x / transform.scale;
  const visibleY = -transform.y / transform.scale;

  return (
    <div
      ref={containerRef}
      className={`canvas-renderer canvas-mode-${canvasMode} ${
        toolMode === 'pan' || spacePressed ? 'is-pan-ready' : ''
      } ${dragState ? 'is-panning' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      <svg className="graph-svg" viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`} preserveAspectRatio="none">
        <defs>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="9" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,212,170,0.35)" />
            <stop offset="100%" stopColor="rgba(121,255,223,0.95)" />
          </linearGradient>

          <marker id="arrow-active" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#00D4AA" />
          </marker>
          <marker id="arrow-muted" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3f4f60" />
          </marker>
          <marker id="arrow-complete" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#46bda9" />
          </marker>
          <marker id="arrow-rerouted" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8a7040" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {edges.map((edge) => {
            const fromNode = nodeMap[edge.from];
            const toNode = nodeMap[edge.to];
            if (!fromNode || !toNode) return null;

            const pathId = `edge-path-${edge.id}`;
            const path = getEdgePath(fromNode, toNode);
            const labelPosition = getLabelPosition(fromNode, toNode);
            const emphasized = isEdgeEmphasized(edge, canvasMode);
            const markerId =
              edge.state === 'active' || edge.state === 'queued'
                ? 'arrow-active'
                : edge.state === 'completed'
                  ? 'arrow-complete'
                  : edge.state === 'rerouted'
                    ? 'arrow-rerouted'
                    : 'arrow-muted';

            return (
              <g
                key={edge.id}
                data-edge-interactive="true"
                className={`graph-edge graph-edge-${edge.state} ${emphasized ? '' : 'is-dim'} ${
                  hoveredEdge?.edgeId === edge.id ? 'is-hovered' : ''
                }`}
                onMouseEnter={(event) => updateHoveredEdge(event, edge, fromNode, toNode)}
                onMouseMove={(event) => updateHoveredEdge(event, edge, fromNode, toNode)}
                onMouseLeave={() => setHoveredEdge(null)}
              >
                <path id={pathId} d={path} fill="none" markerEnd={`url(#${markerId})`} />
                {edge.label ? (
                  <g transform={`translate(${labelPosition.x} ${labelPosition.y})`} className="graph-edge-label">
                    <rect x="-34" y="-13" width="68" height="26" rx="13" />
                    <text textAnchor="middle" dominantBaseline="middle">
                      {edge.label}
                    </text>
                  </g>
                ) : null}
                {isExecuting && edge.state === 'active' ? (
                  <circle className="graph-edge-pulse" r="5">
                    <animateMotion dur="2.6s" repeatCount="indefinite" rotate="auto">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                ) : null}
              </g>
            );
          })}

          {nodes.map((node) => {
            const { width, height } = getNodeDimensions(node);
            const center = getNodeCenter(node);
            const emphasized = isNodeEmphasized(node, canvasMode);
            const isSelected = selectedNode?.id === node.id;

            return (
              <g
                key={node.id}
                data-node-interactive="true"
                className={`graph-node graph-node-${node.state} graph-node-${node.shape} ${
                  emphasized ? '' : 'is-dim'
                } ${isSelected ? 'is-selected' : ''} ${transform.scale < 0.5 ? 'is-compact' : ''}`}
                onClick={() => selectNode(node.id)}
              >
                {node.shape === 'diamond' ? (
                  <polygon
                    points={`${center.x},${node.y} ${node.x + width},${center.y} ${center.x},${node.y + height} ${node.x},${center.y}`}
                    filter={node.state === 'active' || node.state === 'approval' ? 'url(#nodeGlow)' : undefined}
                  />
                ) : (
                  <rect
                    x={node.x}
                    y={node.y}
                    width={width}
                    height={height}
                    rx="24"
                    filter={node.state === 'active' || node.state === 'approval' ? 'url(#nodeGlow)' : undefined}
                  />
                )}

                <g transform={`translate(${node.x + 18} ${node.y + 16})`}>
                  <rect className="graph-node-icon-backdrop" width="28" height="28" rx="10" />
                  <g transform="translate(5 5)">
                    <FlowIcon name={node.icon} size={18} />
                  </g>
                </g>

                <text className="graph-node-title" x={node.x + 56} y={node.y + 34}>
                  {node.title}
                </text>
                <text className="graph-node-subtitle" x={node.x + 56} y={node.y + 58}>
                  {node.subtitle}
                </text>
                <text className="graph-node-caption" x={node.x + 18} y={node.y + height - 14}>
                  {formatNodeCaption(node)}
                </text>

                {node.state === 'approval' ? (
                  <circle className="graph-node-badge" cx={node.x + width - 18} cy={node.y + 18} r="8" />
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="canvas-zoom-controls">
        <button className="canvas-control-button" onClick={() => setTransform((current) => ({ ...current, scale: clamp(current.scale * 1.12, MIN_SCALE, MAX_SCALE) }))}>
          <ZoomIn size={16} />
        </button>
        <button className="canvas-control-button" onClick={() => setTransform((current) => ({ ...current, scale: clamp(current.scale * 0.9, MIN_SCALE, MAX_SCALE) }))}>
          <ZoomOut size={16} />
        </button>
        <button className="canvas-control-button" onClick={fitView}>
          <Scan size={16} />
        </button>
      </div>

      <div className="canvas-bottom-toolbar">
        <button
          className={`canvas-toolbar-button ${toolMode === 'select' ? 'is-active' : ''}`}
          onClick={() => setToolMode('select')}
        >
          <Target size={16} />
        </button>
        <button
          className={`canvas-toolbar-button ${toolMode === 'pan' ? 'is-active' : ''}`}
          onClick={() => setToolMode('pan')}
        >
          <Hand size={16} />
        </button>
        <button className="canvas-toolbar-button">
          <Move size={16} />
        </button>
        <button className="canvas-toolbar-button">
          <MessageSquarePlus size={16} />
        </button>
        <button className="canvas-toolbar-button" onClick={fitView}>
          <Scan size={16} />
        </button>
        <button className="canvas-toolbar-button" onClick={handleFullscreen}>
          <Maximize size={16} />
        </button>
        <button
          className={`canvas-toolbar-button ${showMinimap ? 'is-active' : ''}`}
          onClick={() => setShowMinimap((current) => !current)}
        >
          <Minimize size={16} />
        </button>
      </div>

      {showMinimap ? (
        <div className="canvas-minimap">
          <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}>
            {edges.map((edge) => {
              const fromNode = nodeMap[edge.from];
              const toNode = nodeMap[edge.to];
              if (!fromNode || !toNode) return null;
              return <path key={edge.id} d={getEdgePath(fromNode, toNode)} className={`minimap-edge minimap-edge-${edge.state}`} />;
            })}
            {nodes.map((node) => {
              const { width, height } = getNodeDimensions(node);
              return node.shape === 'diamond' ? (
                <polygon
                  key={node.id}
                  points={`${node.x + width / 2},${node.y} ${node.x + width},${node.y + height / 2} ${node.x + width / 2},${node.y + height} ${node.x},${node.y + height / 2}`}
                  className={`minimap-node minimap-node-${node.state}`}
                />
              ) : (
                <rect
                  key={node.id}
                  x={node.x}
                  y={node.y}
                  width={width}
                  height={height}
                  rx="18"
                  className={`minimap-node minimap-node-${node.state}`}
                />
              );
            })}
            <rect
              className="minimap-viewport"
              x={visibleX}
              y={visibleY}
              width={visibleWidth}
              height={visibleHeight}
              rx="18"
            />
          </svg>
        </div>
      ) : null}

      {hoveredEdge ? (
        <div className="canvas-edge-tooltip" style={{ left: hoveredEdge.left, top: hoveredEdge.top }}>
          <span>{hoveredEdge.label}</span>
          <strong>{hoveredEdge.state}</strong>
        </div>
      ) : null}
    </div>
  );
}

function formatNodeCaption(node) {
  if (node.state === 'approval') return 'Operator checkpoint';
  if (node.confidence) return `${node.confidence}% confidence`;
  return node.type;
}

function formatEdgeState(state) {
  switch (state) {
    case 'active':
      return 'Executing path';
    case 'queued':
      return 'Queued branch';
    case 'completed':
      return 'Resolved path';
    case 'rerouted':
      return 'Rerouted path';
    default:
      return 'Inactive path';
  }
}

export default CanvasRenderer;
