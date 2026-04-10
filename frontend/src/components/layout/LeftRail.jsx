import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import './LeftRail.css';

function LeftRail() {
  const navigate = useNavigate();
  const { connectedAgents, sessions, activeSession, setActiveSession } = useStore();
  const [expandedSections, setExpandedSections] = useState({
    agents: true,
    sessions: true,
    history: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="left-rail">
      {/* Agents Section */}
      <div className="rail-section">
        <button
          className="section-header"
          onClick={() => toggleSection('agents')}
        >
          {expandedSections.agents ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="section-title">AGENTS</span>
        </button>
        
        {expandedSections.agents && (
          <div className="section-content">
            {connectedAgents.length === 0 ? (
              <div className="empty-state">
                <p>No agents connected</p>
              </div>
            ) : (
              connectedAgents.map(agent => (
                <div key={agent.id} className="agent-item">
                  <div className={`status-dot status-dot-${agent.status}`} />
                  <div className="agent-info">
                    <div className="agent-name">{agent.name}</div>
                    <div className="badge badge-sinoper">{agent.type}</div>
                  </div>
                </div>
              ))
            )}
            <button className="add-btn" onClick={() => navigate('/onboarding')}>
              <Plus size={14} />
              Connect Agent
            </button>
          </div>
        )}
      </div>

      {/* Sessions Section */}
      <div className="rail-section">
        <button
          className="section-header"
          onClick={() => toggleSection('sessions')}
        >
          {expandedSections.sessions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="section-title">SESSIONS</span>
        </button>
        
        {expandedSections.sessions && (
          <div className="section-content">
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>No active sessions</p>
              </div>
            ) : (
              sessions.slice(0, 5).map(session => (
                <div
                  key={session.id}
                  className={`session-item ${activeSession?.id === session.id ? 'active' : ''}`}
                  onClick={() => setActiveSession(session)}
                >
                  <div className={`status-dot status-dot-${session.status}`} />
                  <div className="session-info">
                    <div className="session-name">{session.name}</div>
                    <div className="session-excerpt">{session.task}</div>
                    <div className="session-time">{session.elapsed || '0m'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="rail-section">
        <button
          className="section-header"
          onClick={() => toggleSection('history')}
        >
          {expandedSections.history ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="section-title">HISTORY</span>
        </button>
        
        {expandedSections.history && (
          <div className="section-content">
            <div className="empty-state">
              <p>No history yet</p>
            </div>
            <button className="view-all-link" onClick={() => navigate('/history')}>
              View all history →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeftRail;
