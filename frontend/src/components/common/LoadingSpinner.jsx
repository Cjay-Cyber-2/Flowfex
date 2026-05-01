import React from 'react';
import FlowfexLogo from '../../assets/FlowfexLogo';
import './LoadingSpinner.css';

/**
 * Loading Spinner using the Flowfex logo
 * Represents the flow of intelligence through the system
 */
function LoadingSpinner({ size = 60, message = 'Loading...' }) {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <FlowfexLogo variant="icon" size={size} animated={true} />
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
