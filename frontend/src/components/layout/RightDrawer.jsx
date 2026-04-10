import React from 'react';
import { X, CheckCircle, XCircle, Ban, GitBranch } from 'lucide-react';
import useStore from '../../store/useStore';
import './RightDrawer.css';

function RightDrawer() {
  const { selectedNode, setSelectedNode, rightDrawerOpen, setRightDrawerOpen } = useStore();

  if (!rightDrawerOpen || !selectedNode) return null;

  const handleClose = () => {
    setSelectedNode(null);
    setRightDrawerOpen(false);
  };

  return (
    <div className="right-drawer animate-slide-in-right">
      <div className="drawer-header">
        <div className="drawer-title-group">
          <div className="node-icon">{selectedNode.icon || '⚡'}</div>
          <div>
            <h3 className="drawer-title">{selectedNode.name}</h3>
            <span className="badge badge-sinoper">{selectedNode.type}</span>
          </div>
        </div>
        <button className="drawer-close-btn" onClick={handleClose}>
          <X size={16} />
        </button>
      </div>

      <div className="drawer-content">
        {/* Confidence Score */}
        <div className="drawer-section">
          <div className="confidence-display">
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${selectedNode.confidence || 85}%` }}
              />
            </div>
            <span className="confidence-value">{selectedNode.confidence || 85}%</span>
          </div>
        </div>

        {/* Why This Tool Was Chosen */}
        <div className="drawer-section">
          <h4 className="section-heading">Why This Tool Was Chosen</h4>
          <div className="reasoning-block">
            <p>
              {selectedNode.reasoning ||
                'This tool was selected based on the task requirements and available capabilities. It provides the best match for the current execution context.'}
            </p>
          </div>
        </div>

        {/* Alternatives Considered */}
        <div className="drawer-section">
          <h4 className="section-heading">Alternatives Considered</h4>
          <div className="alternatives-list">
            {(selectedNode.alternatives || [
              { name: 'Alternative Tool A', reason: 'Lower confidence score', confidence: 72 },
              { name: 'Alternative Tool B', reason: 'Missing required capability', confidence: 65 }
            ]).map((alt, i) => (
              <div key={i} className="alternative-item">
                <div className="alternative-header">
                  <span className="alternative-name">{alt.name}</span>
                  <span className="alternative-confidence">{alt.confidence}%</span>
                </div>
                <p className="alternative-reason">{alt.reason}</p>
                <div className="alternative-bar">
                  <div
                    className="alternative-bar-fill"
                    style={{ width: `${alt.confidence}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="drawer-section">
          <h4 className="section-heading">Inputs</h4>
          <div className="inputs-list">
            {Object.entries(selectedNode.inputs || { task: 'Sample task input', context: 'Execution context' }).map(
              ([key, value]) => (
                <div key={key} className="input-item">
                  <span className="input-key">{key}:</span>
                  <span className="input-value">{String(value)}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Current State */}
        <div className="drawer-section">
          <h4 className="section-heading">Current State</h4>
          <div className="state-display">
            <span className={`badge badge-${selectedNode.state === 'active' ? 'sinoper' : 'verdigris'}`}>
              {selectedNode.state || 'active'}
            </span>
            <p className="state-description">
              {selectedNode.stateDescription || 'Node is currently processing'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="drawer-section">
          <h4 className="section-heading">Actions</h4>
          <div className="actions-grid">
            <button className="btn-primary" style={{ width: '100%' }}>
              <CheckCircle size={16} />
              Approve
            </button>
            <button className="btn-ghost" style={{ width: '100%' }}>
              <XCircle size={16} />
              Reject
            </button>
            <button className="btn-ghost" style={{ width: '100%' }}>
              <Ban size={16} />
              Block this tool
            </button>
            <button className="btn-ghost" style={{ width: '100%' }}>
              <GitBranch size={16} />
              Reroute from here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RightDrawer;
