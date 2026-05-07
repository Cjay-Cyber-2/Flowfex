import React, { useRef, useState } from 'react';
import { useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import AnimatedCodeBlock from './AnimatedCodeBlock';

/**
 * Minimal developers strip: scroll-driven code preview only (landing).
 * Copy and layout of the code panel stay in AnimatedCodeBlock / developer.css.
 */
function DeveloperSection() {
  const sectionRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const tabIndex = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    [0, 0, 1, 2]
  );

  useMotionValueEvent(tabIndex, 'change', (latest) => {
    const nextTab = Math.max(0, Math.min(2, Math.round(latest)));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  });

  return (
    <section id="developer" data-section-id="developer" ref={sectionRef} className="developer-section developer-section--minimal">
      <div className="developer-container developer-container--minimal">
        <AnimatedCodeBlock activeTab={activeTab} />
      </div>
    </section>
  );
}

export default DeveloperSection;
