import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Lock, Hand } from 'lucide-react';
import FlowIcon from '../common/FlowIcon';
import './Node.css';

/**
 * Node Component - The fundamental unit of orchestration
 * 
 * 7 States: idle, queued, executing, awaiting-approval, completed, rejected, selected
 * Each state has distinct visual treatment and animations
 */
function Node({ node, isSelected, zoom, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const {
    id,
    type = 'skill',
    state = 'idle',
    icon = 'workflow',
    title = 'Untitled Node',
    subtitle = 'No description',
    x = 0,
    y = 0,
    width = 160,
    height = 72,
    shape = 'rectangle', // 'rectangle' | 'diamond'
  } = node;

  // Determine if labels should be visible based on zoom
  const showLabels = zoom >= 0.5;
  const showMetadata = zoom >= 1.5;
  const showTypeBadge = zoom >= 0.7;

  // Get state-specific class
  const getStateClass = () => {
    if (isSelected) return 'node-selected';
    return `node-${state}`;
  };

  // Get approval badge icon
  const getApprovalBadge = () => {
    if (state === 'awaiting-approval') {
      return (
        <motion.div
          className="node-approval-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Hand size={10} />
        </motion.div>
      );
    }
    return null;
  };

  // Get completion badge
  const getCompletionBadge = () => {
    if (state === 'completed') {
      return (
        <div className="node-checkmark-badge">
          <Check size={10} />
        </div>
      );
    }
    if (state === 'rejected' || state === 'skipped') {
      return (
        <div className="node-reject-badge">
          <X size={10} />
        </div>
      );
    }
    return null;
  };

  // Handle hover with delay for tooltip
  const handleMouseEnter = () => {
    setIsHovered(true);
    setTimeout(() => setShowTooltip(true), 600);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowTooltip(false);
  };

  // Handle click
  const handleClick = (e) => {
    e.stopPropagation();
    onSelect();
  };

  // Diamond node rendering
  if (shape === 'diamond') {
    return (
      <motion.div
        className={`node node-diamond ${getStateClass()}`}
        style={{
          left: x,
          top: y,
          width: 80,
          height: 80,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
      >
        <div className="node-diamond-inner">
          <div className="node-icon">
            <FlowIcon name={icon} size={18} />
          </div>
          
          {state === 'executing' && (
            <div className="node-rotating-arc" />
          )}
          
          {getApprovalBadge()}
          {getCompletionBadge()}
        </div>
        
        {showLabels && (
          <div className="node-diamond-label">
            {title}
          </div>
        )}
        
        {showTooltip && (
          <motion.div
            className="node-tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="node-tooltip-type">{type}</div>
            <div className="node-tooltip-desc">{subtitle}</div>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Rectangle node rendering
  return (
    <motion.div
      className={`node node-rectangle ${getStateClass()}`}
      style={{
        left: x,
        top: y,
        width,
        height,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
    >
      {/* Node background and border */}
      <div className="node-background" />
      
      {/* Executing state: rotating arc */}
      {state === 'executing' && (
        <div className="node-rotating-arc" />
      )}
      
      {/* Awaiting approval: breathing border */}
      {state === 'awaiting-approval' && (
        <div className="node-breathing-border" />
      )}
      
      {/* Node content */}
      <div className="node-content">
        {/* Icon */}
        <div className="node-icon-container">
          <div className="node-icon-bg" />
          <div className="node-icon">
            <FlowIcon name={icon} size={18} />
          </div>
        </div>
        
        {/* Labels */}
        {showLabels && (
          <div className="node-labels">
            <div className="node-title">{title}</div>
            <div className="node-subtitle">{subtitle}</div>
          </div>
        )}
        
        {/* Type badge */}
        {showTypeBadge && (
          <div className="node-type-badge" data-type={type} />
        )}
        
        {/* State badges */}
        {getApprovalBadge()}
        {getCompletionBadge()}
      </div>
      
      {/* Metadata (visible at high zoom) */}
      {showMetadata && (
        <div className="node-metadata">
          <div className="node-metadata-item">ID: {id}</div>
        </div>
      )}
      
      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          className="node-tooltip"
          initial={{ opacity: 0, scale: 0.95, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="node-tooltip-type">{type}</div>
          <div className="node-tooltip-desc">{subtitle}</div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default Node;
