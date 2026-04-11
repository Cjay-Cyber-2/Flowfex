import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const features = [
  'Prompt-based attach — paste one line into any agent',
  'SDK for JavaScript and Python',
  'Live socket connection for streaming agents',
  'Zero lock-in — works with any agent framework'
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