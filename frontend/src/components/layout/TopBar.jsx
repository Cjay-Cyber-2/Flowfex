import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Settings, Link2 } from 'lucide-react';
import FlowfexLogo from '../../assets/FlowfexLogo';
import useStore from '../../store/useStore';
import './TopBar.css';

function TopBar() {
  const navigate = useNavigate();
  const {
    canvasMode,
    setCanvasMode,
    isExecuting,
    setIsExecuting,
    activeSession
  } = useStore();

  const modes = [
    { id: 'map', label: 'MAP' },
    { id: 'flow', label: 'FLOW' },
    { id: 'live', label: 'LIVE' }
  ];

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="logo-container" onClick={() => navigate('/')}>
          <FlowfexLogo variant="full" size={28} animated={false} />
        </div>
        <div className="session-name">
          {activeSession?.name || 'Untitled Session'}
        </div>
      </div>
      
      <div className="top-bar-center">
        <div className="mode-toggle">
          {modes.map(mode => (
            <button
              key={mode.id}
              className={`mode-btn ${canvasMode === mode.id ? 'active' : ''}`}
              onClick={() => setCanvasMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="top-bar-right">
        <button className="top-bar-btn" onClick={() => navigate('/onboarding')}>
          <Link2 size={16} />
          <span>Connect Agent</span>
        </button>
        
        <div className="divider-vertical" />
        
        <button
          className={`top-bar-btn ${isExecuting ? 'btn-active' : ''}`}
          onClick={() => setIsExecuting(!isExecuting)}
        >
          {isExecuting ? <Pause size={16} /> : <Play size={16} />}
          <span>{isExecuting ? 'Pause' : 'Start'}</span>
        </button>
        
        <button className="top-bar-icon-btn" onClick={() => navigate('/settings')}>
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}

export default TopBar;
