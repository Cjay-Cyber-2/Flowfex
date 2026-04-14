import React from 'react';

export default function FlowfexLogoNew({ size = 32, animated = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flowfex-logo ${className}`}
      draggable="false"
    >
      {/* Simple minimal logo - just the mark */}
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M 16 8 L 22 14 L 16 20 L 10 14 Z"
        fill="currentColor"
        opacity="0.8"
      />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
