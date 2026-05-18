import React from 'react';
import SyniqLogoSVG from './common/SyniqLogoSVG';

/**
 * Syniq brand logo — renders the official SVG mark at the requested size.
 *
 * This is the single entry point every file should use for the Syniq
 * brand mark.  All previous text-based logos have been replaced by the
 * scalable SVG version so the mark stays sharp at any zoom level.
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
