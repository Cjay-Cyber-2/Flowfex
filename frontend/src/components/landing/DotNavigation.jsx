import React from 'react';

function DotNavigation({ sections, activeSection, onSectionChange }) {
  const handleDotClick = (event, sectionId) => {
    event.preventDefault();
    if (typeof onSectionChange === 'function') {
      onSectionChange(sectionId);
    } else {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="landing-dot-nav" aria-label="Landing page sections">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={`landing-dot ${activeSection === section.id ? 'is-active' : ''}`}
          aria-label={section.label}
          data-label={section.label}
          onClick={(event) => handleDotClick(event, section.id)}
        />
      ))}
    </nav>
  );
}

export default DotNavigation;
