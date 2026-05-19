import React from 'react';
import SyniqLogoSVG from './common/SyniqLogoSVG';

/**
 * Syniq brand logo — renders the official transparent logo asset.
 *
 * This is the single entry point every file should use for the Syniq
 * brand mark.
 */
export default function SyniqLogoNew({ size = 32, animated = false, className = '' }) {
  return (
    <SyniqLogoSVG
      size={size}
      animated={animated}
      className={className}
    />
  );
}
