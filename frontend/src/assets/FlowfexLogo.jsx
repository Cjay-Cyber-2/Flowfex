import React from 'react';
import FlowfexLogoNew from '../components/FlowfexLogoNew';

function FlowfexLogo({ size = 40, animated = false, className = '' }) {
  return <FlowfexLogoNew size={size} animated={animated} className={className} />;
}

export default FlowfexLogo;
