// MainDashboard.jsx - Complete Flowfex AI Orchestration Platform
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Square, Settings, Maximize2, Minimize2, 
  Layers, GitBranch, Activity, Eye, EyeOff, Filter,
  Search, MoreHorizontal, Zap, Link, Database, Code,
  Brain, Cpu, Network, Globe, Lock, Unlock, Plus,
  MessageSquare, Terminal, Smartphone, Monitor, Wifi,
  CheckCircle, XCircle, Clock, AlertTriangle, Info
} from 'lucide-react';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import { motion, AnimatePresence } from 'framer-motion';import ConnectAgentModal from '../components/ConnectAgentModal';import './MainDashboard.css';

export default function MainDashboard() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('flow'); // map, flow, live
  const [isExecuting, setIsExecuting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);  const [isModalOpen, setIsModalOpen] = useState(false);  const [showTaskTooltip, setShowTaskTooltip] = useState(true);
  const [connectedAgents, setConnectedAgents] = useState([
    { id: 1, name: 'Claude Assistant', type: 'chat', status: 'connected', lastSeen: '2 min ago' },
    { id: 2, name: 'VS Code Agent', type: 'ide', status: 'offline', lastSeen: '1 hour ago' }
  ]);
  const [currentTask, setCurrentTask] = useState('Analyze user data and generate insights');
  const [executionStep, setExecutionStep] = useState(3);
  const [totalSteps, setTotalSteps] = useState(6);
  const canvasRef = useRef(null);

  // Real Flowfex orchestration nodes - representing actual AI skills and tools
  const nodes = [
    { 
      id: 1, 
      type: 'input', 
      label: 'User Request', 
      x: 100, 
      y: 200, 
      status: 'completed', 
      confidence: 95,
      skill: 'input_parser',
      reasoning: 'Parsed user intent: "Analyze user data and generate insights"',
      alternatives: ['text_processor', 'intent_classifier']
    },
    { 
      id: 2, 
      type: 'analysis', 
      label: 'Intent Analysis', 
      x: 300, 
      y: 150, 
      status: 'completed', 
      confidence: 87,
      skill: 'intent_analyzer',
      reasoning: 'Identified data analysis task with visualization requirements',
      alternatives: ['nlp_processor', 'task_classifier']
    },
    { 
      id: 3, 
      type: 'decision', 
      label: 'Tool Selection', 
      x: 500, 
      y: 200, 
      status: 'active', 
      confidence: 72,
      skill: 'tool_selector',
      reasoning: 'Evaluating between database query and API call based on data source',
      alternatives: ['skill_router', 'capability_matcher'],
      needsApproval: true
    },
    { 
      id: 4, 
      type: 'tool', 
      label: 'Database Query', 
      x: 700, 
      y: 120, 
      status: 'pending', 
      confidence: 0,
      skill: 'sql_executor',
      reasoning: 'Will execute SELECT query on user_analytics table',
      alternatives: ['nosql_query', 'data_fetcher']
    },
    { 
      id: 5, 
      type: 'tool', 
      label: 'Data Visualization', 
      x: 700, 
      y: 280, 
      status: 'waiting', 
      confidence: 0,
      skill: 'chart_generator',
      reasoning: 'Generate interactive charts from query results',
      alternatives: ['report_builder', 'dashboard_creator']
    },
    { 
      id: 6, 
      type: 'output', 
      label: 'Response Generation', 
      x: 900, 
      y: 200, 
      status: 'waiting', 
      confidence: 0,
      skill: 'response_formatter',
      reasoning: 'Format analysis results with insights and recommendations',
      alternatives: ['text_generator', 'summary_creator']
    }
  ];

  const connections = [
    { from: 1, to: 2, status: 'completed' },
    { from: 2, to: 3, status: 'active' },
    { from: 3, to: 4, status: 'pending' },
    { from: 3, to: 5, status: 'pending' },
    { from: 4, to: 6, status: 'waiting' },
    { from: 5, to: 6, status: 'waiting' }
  ];

  // Available skills (380+ in real system)
  const availableSkills = [
    { id: 'sql_executor', name: 'SQL Database Query', category: 'Data', confidence: 95 },
    { id: 'api_caller', name: 'REST API Client', category: 'Integration', confidence: 88 },
    { id: 'file_reader', name: 'File System Reader', category: 'I/O', confidence: 92 },
    { id: 'chart_generator', name: 'Chart Generator', category: 'Visualization', confidence: 85 },
    { id: 'text_analyzer', name: 'Text Analysis', category: 'NLP', confidence: 90 },
    { id: 'image_processor', name: 'Image Processing', category: 'Vision', confidence: 78 }
  ];

  const connectionMethods = [
    { 
      id: 'prompt', 
      name: 'Prompt Connection', 
      icon: <MessageSquare size={24} />,
      description: 'Copy a prompt to paste into any AI agent',
      recommended: true
    },
    { 
      id: 'link', 
      name: 'Link Connection', 
      icon: <Link size={24} />,
      description: 'Generate a secure connection link'
    },
    { 
      id: 'sdk', 
      name: 'SDK Integration', 
      icon: <Code size={24} />,
      description: 'Add 3 lines of code to your application'
    },
    { 
      id: 'live', 
      name: 'Live Channel', 
      icon: <Wifi size={24} />,
      description: 'Real-time WebSocket connection'
    }
  ];

  const getNodeIcon = (type) => {
    switch (type) {
      case 'input': return <MessageSquare size={16} />;
      case 'analysis': return <Brain size={16} />;
      case 'decision': return <GitBranch size={16} />;
      case 'tool': return <Zap size={16} />;
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

  const handleApproveNode = (nodeId) => {
    // Simulate approval - move to next step
    setExecutionStep(prev => prev + 1);
    setIsExecuting(true);    setShowTaskTooltip(false);
  };

  const handleRejectNode = (nodeId) => {
    // Simulate rejection - show rerouting
    console.log('Rejecting node:', nodeId);
  };

  const handleConnectAgent = (method) => {
    if (method === 'prompt') {
      // Show prompt connection
      const prompt = `Connect to Flowfex orchestration layer:
      
Use this connection string in your AI agent:
flowfex://connect?session=${Date.now()}&mode=orchestration

This will route all your tool selections through Flowfex for visual orchestration and user control.`;
      
      navigator.clipboard.writeText(prompt);
      alert('Connection prompt copied to clipboard!');
    }
    setShowConnectModal(false);
  };

  return (
    <div className="main-dashboard">
      {/* Top Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-left">
          <FlowfexLogoNew size={28} animated={false} />
          <div className="session-info">
            <span className="session-name">{currentTask}</span>
            <span className="session-status">
              {connectedAgents.filter(a => a.status === 'connected').length} agents connected
            </span>
          </div>
        </div>
        
        <div className="nav-center">
          <div className="view-mode-toggle">
            <button 
              className={`mode-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Map Mode - Full graph overview"
            >
              <Layers size={16} />
              Map
            </button>
            <button 
              className={`mode-btn ${viewMode === 'flow' ? 'active' : ''}`}
              onClick={() => setViewMode('flow')}
              title="Flow Mode - Active execution path"
            >
              <GitBranch size={16} />
              Flow
            </button>
            <button 
              className={`mode-btn ${viewMode === 'live' ? 'active' : ''}`}
              onClick={() => setViewMode('live')}
              title="Live Mode - Real-time execution"
            >
              <Activity size={16} />
              Live
            </button>
          </div>
        </div>
        
        <div className="nav-right">
          <button 
            className="nav-btn connect-btn"
            onClick={() => setIsModalOpen(true)}
            title="Connect Agent"
          >
            <Plus size={18} />
            Connect Agent
          </button>
          <button className="nav-btn" title="Search">
            <Search size={18} />
          </button>
          <button className="nav-btn" title="Filter">
            <Filter size={18} />
          </button>
          <button className="nav-btn" title="Settings">
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
                <h4>Connected Agents</h4>
                <div className="agent-list">
                  {connectedAgents.map(agent => (
                    <div key={agent.id} className={`agent-item ${agent.status === 'connected' ? 'active' : ''}`}>
                      <div className={`agent-status ${agent.status}`}></div>
                      <div className="agent-info">
                        <span className="agent-name">{agent.name}</span>
                        <small className="agent-type">{agent.type} • {agent.lastSeen}</small>
                      </div>
                      {agent.type === 'chat' && <MessageSquare size={14} />}
                      {agent.type === 'ide' && <Monitor size={14} />}
                      {agent.type === 'cli' && <Terminal size={14} />}
                      {agent.type === 'web' && <Globe size={14} />}
                    </div>
                  ))}
                  <button 
                    className="add-agent-btn"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Plus size={16} />
                    Connect New Agent
                  </button>
                </div>
              </div>
              
              <div className="sidebar-section">
                <h4>Available Skills ({availableSkills.length})</h4>
                <div className="skills-list">
                  {availableSkills.slice(0, 6).map(skill => (
                    <div key={skill.id} className="skill-item">
                      <div className="skill-info">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-category">{skill.category}</span>
                      </div>
                      <div className="skill-confidence">{skill.confidence}%</div>
                    </div>
                  ))}
                  <button className="view-all-skills">
                    View All 380+ Skills
                  </button>
                </div>
              </div>
              
              <div className="sidebar-section">
                <h4>Recent Sessions</h4>
                <div className="session-list">
                  <div className="session-item active">
                    <div className="session-info">
                      <span>Data Analysis Task</span>
                      <small>Active • Step {executionStep} of {totalSteps}</small>
                    </div>
                    <div className="session-status running"></div>
                  </div>
                  <div className="session-item">
                    <div className="session-info">
                      <span>Code Review</span>
                      <small>Completed • 15 min ago</small>
                    </div>
                    <div className="session-status completed"></div>
                  </div>
                  <div className="session-item">
                    <div className="session-info">
                      <span>Research Query</span>
                      <small>Completed • 1 hour ago</small>
                    </div>
                    <div className="session-status completed"></div>
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
                title={isExecuting ? 'Pause execution' : 'Start execution'}
              >
                {isExecuting ? <Pause size={18} /> : <Play size={18} />}
                {isExecuting ? 'Pause' : 'Start'}
              </button>
              <button 
                className="control-btn"
                onClick={() => setIsExecuting(false)}
                title="Stop execution"
              >
                <Square size={18} />
                Stop
              </button>
              <button 
                className="control-btn"
                title="Step through execution"
              >
                <GitBranch size={18} />
                Step
              </button>
            </div>
            
            <div className="canvas-info">
              <span>Step {executionStep} of ~{totalSteps}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(executionStep / totalSteps) * 100}%` }}
                ></div>
              </div>
              <span className="execution-status">
                {isExecuting ? 'Executing...' : 'Paused'}
              </span>
            </div>
            
            <div className="canvas-controls">
              <button className="control-btn" title="Zoom to fit">
                <Maximize2 size={16} />
              </button>
              <button className="control-btn" title="Reset view">
                <Eye size={16} />
              </button>
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
                
                const isActive = conn.status === 'active' || (fromNode.status === 'completed' && toNode.status === 'active');
                const isCompleted = conn.status === 'completed';
                
                return (
                  <g key={index}>
                    <path
                      d={`M ${fromNode.x + 60} ${fromNode.y + 30} Q ${(fromNode.x + toNode.x) / 2} ${fromNode.y - 50} ${toNode.x} ${toNode.y + 30}`}
                      stroke={isCompleted ? "#3D7A6A" : isActive ? "url(#connectionGradient)" : "rgba(122, 106, 92, 0.4)"}
                      strokeWidth={isActive ? "3" : "2"}
                      fill="none"
                      className={isActive ? "active-connection" : isCompleted ? "completed-connection" : ""}
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
                    className={`node ${node.status} ${selectedNode?.id === node.id ? 'selected' : ''} ${viewMode}`}
                    filter={node.status === 'active' ? 'url(#glow)' : ''}
                  />
                  
                  {/* Approval indicator */}
                  {node.needsApproval && (
                    <circle
                      cx={node.x + 100}
                      cy={node.y + 20}
                      r="8"
                      fill="#C78B2A"
                      className="approval-indicator pulsing"
                    />
                  )}
                  
                  {/* Node content */}
                  <foreignObject x={node.x + 8} y={node.y + 8} width="104" height="44">
                    <div className="node-content">
                      <div className="node-header">
                        {getNodeIcon(node.type)}
                        <span className="node-type">{node.type}</span>
                        {node.needsApproval && <AlertTriangle size={12} className="approval-icon" />}
                      </div>
                      <div className="node-label">{node.label}</div>
                      <div className="node-skill">{node.skill}</div>
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

      {/* Task tooltip */}
      <AnimatePresence>
        {showTaskTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
              background: '#161E28', border: '1px solid rgba(158,48,40,0.3)',
              borderRadius: 24, padding: '10px 20px', zIndex: 200,
              fontFamily: 'var(--font-inter)', fontSize: 13, color: '#EDE8DF',
              whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >
            <span style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0, borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent', borderBottom: '5px solid rgba(158,48,40,0.3)' }} />
            Send a task to begin orchestration →
          </motion.div>
        )}
      </AnimatePresence>

      <ConnectAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
