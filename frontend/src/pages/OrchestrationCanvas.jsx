import React, { useState, useEffect } from 'react';
import { Play, Pause, Settings, Plus } from 'lucide-react';
import useStore from '../store/useStore';
import CanvasRenderer from '../components/canvas/CanvasRenderer';
import LeftRail from '../components/layout/LeftRail';
import TopBar from '../components/layout/TopBar';
import RightDrawer from '../components/layout/RightDrawer';
import '../styles/canvas.css';

function OrchestrationCanvas() {
  const {
    canvasMode,
    isExecuting,
    setIsExecuting,
    connectedAgents,
    activeSession
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    // Initialize WebSocket connection with error handling
    try {
      const ws = new WebSocket('ws://localhost:4000/ws');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setBackendConnected(true);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error (backend not available):', error);
        setBackendConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setBackendConnected(false);
      };
      
      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setBackendConnected(false);
    }
  }, []);

  const handleExecutionToggle = () => {
    setIsExecuting(!isExecuting);
  };

  return (
    <div className="orchestration-canvas-page">
      <TopBar />
      
      <div className="canvas-layout">
        <LeftRail />
        
        <div className="canvas-main">
          <CanvasRenderer />
          
          {/* Canvas Controls */}
          <div className="canvas-controls">
            <button className="canvas-control-btn" aria-label="Zoom in">
              <Plus size={16} />
            </button>
            <button className="canvas-control-btn" aria-label="Zoom out">
              <span style={{ fontSize: '20px', lineHeight: 1 }}>−</span>
            </button>
            <button className="canvas-control-btn" aria-label="Fit to view">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
            </button>
          </div>
          
          {/* Execution Control Bar */}
          {(canvasMode === 'flow' || canvasMode === 'live') && (
            <div className="execution-control-bar">
              <div className="execution-info">
                <span className="step-counter">Step 4 of ~12</span>
              </div>
              
              <div className="execution-controls">
                <button
                  className="execution-btn"
                  onClick={handleExecutionToggle}
                  aria-label={isExecuting ? 'Pause execution' : 'Resume execution'}
                  title={isExecuting ? 'Pause' : 'Resume'}
                >
                  {isExecuting ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button 
                  className="execution-btn" 
                  aria-label="Step forward"
                  title="Execute next step"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 4L14 10L6 16V4Z" fill="currentColor" />
                    <rect x="14" y="4" width="2" height="12" fill="currentColor" />
                  </svg>
                </button>
                <button 
                  className="execution-btn execution-btn-stop" 
                  aria-label="Stop execution"
                  title="Stop"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="5" y="5" width="10" height="10" fill="currentColor" />
                  </svg>
                </button>
              </div>
              
              <div className="execution-options">
                <button className="btn-ghost btn-sm">Constrain tools</button>
                <div className="speed-control">
                  <span className="speed-label">Speed</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="50"
                    className="speed-slider"
                    aria-label="Execution speed"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <RightDrawer />
      </div>
    </div>
  );
}

export default OrchestrationCanvas;
