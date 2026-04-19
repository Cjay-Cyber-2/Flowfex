import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AnimatedCodeBlock from './AnimatedCodeBlock';
import FeatureList from './FeatureList';

function DeveloperSection() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [featureProgress, setFeatureProgress] = useState(0);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  // Map scroll progress to tab index (0-2)
  const tabIndex = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    [0, 0, 1, 2]
  );

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setFeatureProgress(latest);
  });

  useMotionValueEvent(tabIndex, 'change', (latest) => {
    const nextTab = Math.max(0, Math.min(2, Math.round(latest)));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  });

  return (
    <section id="developer" data-section-id="developer" ref={sectionRef} className="developer-section">
      <div className="developer-container">
        <div className="developer-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-kicker">FOR DEVELOPERS</span>
            <h2 className="section-headline">Give any agent a clean way to attach.</h2>
            <p className="section-description">
              Use a short prompt, a link, an SDK snippet, or a live channel. Flowfex tells the agent how to
              connect, where to pull resources from, and how to report each step back to the session.
            </p>
          </motion.div>

          <FeatureList scrollProgress={featureProgress} />

          <motion.div 
            className="developer-ctas"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button className="btn-ghost developer-cta" onClick={() => navigate('/demo')}>
              Watch Demo
            </button>
            <button className="btn-primary developer-cta" onClick={() => navigate('/onboarding')}>
              Connect Agent
            </button>
          </motion.div>
        </div>
        
        <div className="developer-right">
          <AnimatedCodeBlock activeTab={activeTab} />
        </div>
      </div>
    </section>
  );
}

export default DeveloperSection;
