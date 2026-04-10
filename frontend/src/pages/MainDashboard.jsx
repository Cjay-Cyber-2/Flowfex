// MainDashboard.jsx - Premium n8n + Obsidian inspired interface
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Square, Settings, Maximize2, Minimize2, 
  Layers, GitBranch, Activity, Eye, EyeOff, Filter,
  Search, MoreHorizontal, Zap, Link, Database, Code,
  Brain, Cpu, Network, Globe, Lock, Unlock
} from 'lucide-react';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import './MainDashboard.css';

export default function MainDashboard() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('flow'); // map, flow, live
  const [isExecuting, setIsExecuting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const canvasRef = useRef(null);

  // Sample nodes data
  const nodes = [
    { id: 1, type: 'input', label: 'User Input', x: 100, y: 200, status: 'completed', confidence: 95 },
    { id: 2, type: 'analysis', label: 'Intent Analysis', x: 300, y: 150, status: 'active', confidence: 87 },
    { id: 3, type: 'decision', label: 'Route Decision', x: 500, y: 200, status: 'pending', confidence: 72 },
    { id: 4, type: 'tool', label: 'Database Query', x: 700, y: 120, status: 'waiting', confidence: 0 },
    { id: 5, type: 'tool', label: 'API Call', x: 700, y: 280, status: 'waiting', confidence: 0 },
    { id: 6, type: 'output', label: 'Response', x: 900, y: 200, status: 'waiting', confidence: 0 }
  ];

  const connections = [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 4, to: 6 },
    { from: 5, to: 6 }
  ];

  const getNodeIcon = (type) => {
    switch (type) {
      case 'input': return <Zap size={16} />;
      case 'analysis': return <Brain size={16} />;
      case 'decision': return <GitBranch size={16} />;
      case 'tool': return <Database size={16} />;
      case 'output': return <Globe size={16} />;
      default: return <Cpu size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#3D7A6A';
      case 'active': return '#C49530';
      case 'pending': return '#C78B2A';
      case 'waiting': return '#7A6A5C';
      case 'error': return '#C23028';
      default: return '#7A6A5C';
    }
  };

  return (
    <div className="main-dashboard">
      {/* Top Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-left">
          <FlowfexLogoNew size={28} animated={true} />
          <span className="nav-title">Flowfex</span>
          <div className="session-info">
            <span className="session-name">AI Assistant Session</span>
            <span className="session-status">Connected</span>
          </div>
        </div>
        
        <div className="nav-center">
          <div className="view-mode-toggle">
            <button 
              className={`mode-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Layers size={16} />
              Map
            </button>
            <button 
              className={`mode-btn ${viewMode === 'flow' ? 'active' : ''}`}
              onClick={() => setViewMode('flow')}
            >
              <GitBranch size={16} />
              Flow
            </button>
            <button 
              className={`mode-btn ${viewMode === 'live' ? 'active' : ''}`}
              onClick={() => setViewMode('live')}
            >
              <Activity size={16} />
              Live
            </button>
          </div>
        </div>
        
        <div className="nav-right">
          <button className="nav-btn">
            <Search size={18} />
          </button>
          <button className="nav-btn">
            <Filter size={18} />
          </button>
          <button className="nav-btn">
            <Settings size={18} />
          </button>
        </div>
      </nav>

      <div className="dashboard-body">
        {/* Left Sidebar */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h3>Sessions</h3>
            <button 
              className="collapse-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>
          
          {!sidebarCollapsed && (
            <>
              <div className="sidebar-section">
                <h4>Active Agents</h4>
                <div className="agent-list">
                  <div className="agent-item active">
                    <div className="agent-status"></div>
                    <span>Claude Assistant</span>
                  </div>
                  <div className="agent-item">
                    <div className="agent-status offline"></div>
                    <span>GPT-4 Agent</span>
                  </div>
                </div>
              </div>
              
              <div className="sidebar-section">
                <h4>Recent Sessions</h4>
                <div className="session-list">
                  <div className="session-item">
                    <span>Data Analysis Task</span>
                    <small>2 min ago</small>
                  </div>
                  <div className="session-item">
                    <span>Code Review</span>
                    <small>15 min ago</small>
                  </div>
                  <div className="session-item">
                    <span>Research Query</span>
                    <small>1 hour ago</small>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Main Canvas Area */}
        <main className="canvas-area">
          <div className="canvas-header">
            <div className="execution-controls">
              <button 
                className={`control-btn ${isExecuting ? 'active' : ''}`}
                onClick={() => setIsExecuting(!isExecuting)}
              >
                {isExecuting ? <Pause size={18} /> : <Play size={18} />}
                {isExecuting ? 'Pause' : 'Start'}
              </button>
              <button className="control-btn">
                <Square size={18} />
                Stop
              </button>
            </div>
            
            <div className="canvas-info">
              <span>Step 3 of ~6</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '50%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="canvas-container" ref={canvasRef}>
            <svg className="orchestration-canvas" viewBox="0 0 1200 600">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9E3028" />
                  <stop offset="100%" stopColor="#C49530" />
                </linearGradient>
              </defs>
              
              {/* Grid Background */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(122, 106, 92, 0.1)" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Connections */}
              {connections.map((conn, index) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                
                const isActive = fromNode.status === 'completed' && toNode.status === 'active';
                
                return (
                  <g key={index}>
                    <path
                      d={`M ${fromNode.x + 30} ${fromNode.y + 15} Q ${(fromNode.x + toNode.x) / 2} ${fromNode.y - 50} ${toNode.x} ${toNode.y + 15}`}
                      stroke={isActive ? "url(#connectionGradient)" : "rgba(122, 106, 92, 0.4)"}
                      strokeWidth={isActive ? "3" : "2"}
                      fill="none"
                      className={isActive ? "active-connection" : ""}
                    />
                    
                    {/* Flow particles */}
                    {isActive && (
                      <circle r="4" fill="#C49530" className="flow-particle">
                        <animateMotion dur="2s" repeatCount="indefinite">
                          <mpath href={`#path-${index}`}/>
                        </animateMotion>
                      </circle>
                    )}
                  </g>
                );
              })}
              
              {/* Nodes */}
              {nodes.map(node => (
                <g key={node.id} className="node-group" onClick={() => setSelectedNode(node)}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width="120"
                    height="60"
                    rx="12"
                    fill="rgba(28, 24, 18, 0.9)"
                    stroke={getStatusColor(node.status)}
                    strokeWidth="2"
                    className={`node ${node.status} ${selectedNode?.id === node.id ? 'selected' : ''}`}
                    filter={node.status === 'active' ? 'url(#glow)' : ''}
                  />
                  
                  {/* Node content */}
                  <foreignObject x={node.x + 8} y={node.y + 8} width="104" height="44">
                    <div className="node-content">
                      <div className="node-header">
                        {getNodeIcon(node.type)}
                        <span className="node-type">{node.type}</span>
                      </div>
                      <div className="node-label">{node.label}</div>
                      {node.confidence > 0 && (
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill" 
                            style={{ width: `${node.confidence}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </foreignObject>
                  
                  {/* Status indicator */}
                  <circle
                    cx={node.x + 110}
                    cy={node.y + 10}
                    r="4"
                    fill={getStatusColor(node.status)}
                    className={node.status === 'active' ? 'pulsing' : ''}
                  />
                </g>
              ))}
            </svg>
          </div>
        </main>

        {/* Right Panel */}
        {selectedNode && (
          <aside className="right-panel">
            <div className="panel-header">
              <h3>{selectedNode.label}</h3>
              <button onClick={() => setSelectedNode(null)}>×</button>
            </div>
            
            <div className="panel-content">
              <div className="panel-section">
                <h4>Status</h4>
                <div className="status-badge" style={{ backgroundColor: getStatusColor(selectedNode.status) }}>
                  {selectedNode.status}
                </div>
              </div>
              
              {selectedNode.confidence > 0 && (
                <div className="panel-section">
                  <h4>Confidence</h4>
                  <div className="confidence-display">
                    <div className="confidence-bar-large">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${selectedNode.confidence}%` }}
                      ></div>
                    </div>
                    <span>{selectedNode.confidence}%</span>
                  </div>
                </div>
              )}
              
              <div className="panel-section">
                <h4>Reasoning</h4>
                <p>This node analyzes the user's input to determine the appropriate execution path. It uses natural language processing to extract intent and context.</p>
              </div>
              
              <div className="panel-section">
                <h4>Actions</h4>
                <div className="action-buttons">
                  <button className="action-btn approve">
                    <Unlock size={16} />
                    Approve
                  </button>
                  <button className="action-btn reject">
                    <Lock size={16} />
                    Block
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
