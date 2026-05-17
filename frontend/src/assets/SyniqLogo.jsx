import React from 'react';
import SyniqLogoNew from '../components/SyniqLogoNew';

function SyniqLogo({ size = 40, animated = false, className = '' }) {
  return <SyniqLogoNew size={size} animated={animated} className={className} />;
}

export default SyniqLogo;
