import React from 'react';
import flowfexLogo from '../assets/flowfex-logo-ui.png';

export default function FlowfexLogoNew({ size = 32, animated = false, className = '' }) {
  return (
    <img
      src={flowfexLogo}
      alt="Flowfex"
      className={`flowfex-logo ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
      }}
      draggable="false"
    />
  );
}
