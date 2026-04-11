import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, RotateCcw, Pause } from 'lucide-react';
import FlowIcon from '../common/FlowIcon';
import './RightPanel.css';

/**
 * RightPanel - Node Detail & Decision Transparency
 * 
 * Shows: Header, Decision Transparency, Controls, Configuration
 */
function RightPanel({ selectedNode, onApprove, onReject, onReroute, onPause }) {
  const [alternativesExpanded, setAlternativesExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Empty state
  if (!selectedNode) {
    return (
      <div className="right-panel">
        <div className="right-panel-empty">
          <div className="empty-illustration">
            <div className="empty-circle" />
            <div className="empty-cursor">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
            </div>
          </div>
          <p className="empty-text">Select a node to inspect it.</p>
        </div>
      </div>
    );
  }

  const {
    id,
    type = 'skill',
    icon = 'workflow',
    title = 'Untitled Node',
    subtitle = 'No description',
    state = 'idle',
    reasoning = 'This node was selected based on the current execution context.',
    alternatives = [],
    stages = [],
    config = {},
  } = selectedNode;

  // Get status pill info
  const getStatusInfo = () => {
    const statusMap = {
      idle: { label: 'Pending', color: 'muted' },
      queued: { label: 'Queued', color: 'muted' },
      executing: { label: 'Running', color: 'brand' },
      'awaiting-approval': { label: 'Awaiting Approval', color: 'brand' },
      completed: { label: 'Completed', color: 'success' },
      rejected: { label: 'Rejected', color: 'warning' },
      skipped: { label: 'Skipped', color: 'muted' },
    };
    return statusMap[state] || statusMap.idle;
  };

  const statusInfo = getStatusInfo();

  // Check if controls should be enabled
  const isActionable = state === 'awaiting-approval' || state === 'executing';

  // Handle apply changes
  const handleApplyChanges = async () => {
    setIsApplying(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsApplying(false);
  };

  return (
    <motion.div
      className="right-panel"
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Block */}
      <div className="panel-header">
        <div className="panel-header-icon">
          <FlowIcon name={icon} size={24} />
        </div>
        <div className="panel-header-content">
          <h3 className="panel-node-name">{title}</h3>
          <div className="panel-node-type">{type}</div>
        </div>
        <div className={`panel-status-pill panel-status-${statusInfo.color}`}>
          {statusInfo.label}
        </div>
      </div>

      <div className="panel-divider" />

      {/* Decision Transparency Section */}
      <div className="panel-section">
        <div className="panel-section-label">WHY THIS WAS CHOSEN</div>
        <div className="panel-reasoning-block">
          {reasoning}
        </div>

        {/* Alternatives Considered */}
        {alternatives && alternatives.length > 0 && (
          <div className="panel-alternatives">
            <button
              className="panel-alternatives-toggle"
              onClick={() => setAlternativesExpanded(!alternativesExpanded)}
            >
              <span>Alternatives Considered</span>
              <motion.div
                animate={{ rotate: alternativesExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>

            <AnimatePresence>
              {alternativesExpanded && (
                <motion.div
                  className="panel-alternatives-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {alternatives.map((alt, index) => (
                    <div key={index} className="panel-alternative-item">
                      <FlowIcon name={alt.icon || 'workflow'} size={16} />
                      <span className="panel-alternative-name">{alt.name}</span>
                      <span className="panel-alternative-status">Not selected</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Current State Mini-Timeline */}
        {stages && stages.length > 0 && (
          <div className="panel-timeline">
            <div className="panel-section-label">CURRENT STATE</div>
            <div className="panel-timeline-track">
              {stages.map((stage, index) => (
                <div key={index} className="panel-timeline-stage">
                  <div className={`panel-timeline-marker panel-timeline-marker-${stage.status}`}>
                    {stage.status === 'completed' && <Check size={8} />}
                  </div>
                  <div className="panel-timeline-label">{stage.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel-divider" />

      {/* Control Block */}
      <div className="panel-section">
        <div className="panel-section-label">CONTROLS</div>
        <div className="panel-control-grid">
          <motion.button
            className="panel-control-button panel-control-approve"
            onClick={onApprove}
            disabled={!isActionable}
            whileHover={isActionable ? { scale: 1.02 } : {}}
            whileTap={isActionable ? { scale: 0.97 } : {}}
          >
            <Check size={16} />
            Approve
          </motion.button>

          <motion.button
            className="panel-control-button panel-control-reject"
            onClick={onReject}
            disabled={!isActionable}
            whileHover={isActionable ? { scale: 1.02 } : {}}
            whileTap={isActionable ? { scale: 0.97 } : {}}
          >
            <X size={16} />
            Reject
          </motion.button>

          <motion.button
            className="panel-control-button panel-control-ghost"
            onClick={onReroute}
            disabled={!isActionable}
            whileHover={isActionable ? { scale: 1.02 } : {}}
            whileTap={isActionable ? { scale: 0.97 } : {}}
          >
            <RotateCcw size={16} />
            Reroute
          </motion.button>

          <motion.button
            className="panel-control-button panel-control-ghost"
            onClick={onPause}
            disabled={!isActionable}
            whileHover={isActionable ? { scale: 1.02 } : {}}
            whileTap={isActionable ? { scale: 0.97 } : {}}
          >
            <Pause size={16} />
            Pause
          </motion.button>
        </div>
      </div>

      <div className="panel-divider" />

      {/* Configuration Section */}
      <div className="panel-section">
        <div className="panel-section-label">CONFIGURATION</div>
        
        <div className="panel-config-fields">
          {/* Example config fields */}
          <div className="panel-config-field">
            <label className="panel-config-label">Timeout (seconds)</label>
            <input
              type="number"
              className="panel-config-input"
              defaultValue={config.timeout || 30}
            />
          </div>

          <div className="panel-config-field">
            <label className="panel-config-label">Retry on failure</label>
            <label className="panel-config-toggle">
              <input type="checkbox" defaultChecked={config.retry || false} />
              <span className="panel-config-toggle-slider" />
            </label>
          </div>

          <div className="panel-config-field">
            <label className="panel-config-label">Priority</label>
            <select className="panel-config-select" defaultValue={config.priority || 'normal'}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Apply Changes Button */}
      <motion.button
        className="panel-apply-button"
        onClick={handleApplyChanges}
        disabled={isApplying}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <AnimatePresence mode="wait">
          {isApplying ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="panel-apply-loading"
            >
              <div className="panel-apply-spinner" />
            </motion.div>
          ) : (
            <motion.span
              key="text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Apply Changes
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}

export default RightPanel;
