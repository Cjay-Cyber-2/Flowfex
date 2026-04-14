import React from 'react';
import { logos } from '../../data/landing/logos';

function LogoMarquee() {
  // Duplicate logos for seamless loop
  const duplicatedLogos = [...logos, ...logos];

  return (
    <div className="logo-marquee">
      {/* Row 1: Left to right */}
      <div className="marquee-row marquee-row-1">
        <div className="marquee-content">
          {duplicatedLogos.map((logo, i) => (
            <div key={`row1-${i}`} className="marquee-logo">
              <span className="marquee-logo-icon">{logo.icon}</span>
              <span className="marquee-logo-name">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Right to left */}
      <div className="marquee-row marquee-row-2">
        <div className="marquee-content">
          {duplicatedLogos.map((logo, i) => (
            <div key={`row2-${i}`} className="marquee-logo">
              <span className="marquee-logo-icon">{logo.icon}</span>
              <span className="marquee-logo-name">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LogoMarquee;
