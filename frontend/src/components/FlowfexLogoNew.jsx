import React from 'react';
import flowfexLogo from '../assets/flowfex-logo-official.png';

export default function FlowfexLogoNew({ size = 32, animated = false, className = '' }) {
  return (
    <img
      src={flowfexLogo}
      alt="Flowfex"
      className={`flowfex-logo ${className}`}
      style={{
        height: size,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
      draggable="false"
    />
  );
}
