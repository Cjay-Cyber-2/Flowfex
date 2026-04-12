import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const features = [
  'Paste a short prompt into an IDE, CLI, or web agent',
  'Share a secure link when you want a quick attach flow',
  'Use SDK helpers for JavaScript, Python, or custom clients',
  'Keep one live view across every connected environment'
];

function FeatureList({ scrollProgress }) {
  return (
    <div className="feature-list">
      {features.map((feature, i) => (
        <motion.div
          key={i}
          className="feature-item"
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: scrollProgress > (i + 1) * 0.2 ? 1 : 0,
            x: scrollProgress > (i + 1) * 0.2 ? 0 : -20
          }}
          transition={{ 
            duration: 0.6, 
            ease: [0.34, 1.56, 0.64, 1],
            delay: i * 0.1
          }}
        >
          <Check size={16} className="feature-check" />
          <span className="feature-text">{feature}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default FeatureList;
