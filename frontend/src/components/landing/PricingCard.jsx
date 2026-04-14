import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

function PricingCard({ tier, delay = 0, slideFrom = 'left', featured = false }) {
  const cardVariants = {
    left: {
      hidden: { opacity: 0, x: -40 },
      visible: { opacity: 1, x: 0 }
    },
    right: {
      hidden: { opacity: 0, x: 40 },
      visible: { opacity: 1, x: 0 }
    },
    bottom: {
      hidden: { opacity: 0, y: 40 },
      visible: { opacity: 1, y: 0 }
    }
  };

  return (
    <motion.div
      className={`pricing-card ${featured ? 'featured' : ''}`}
      variants={cardVariants[slideFrom]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1],
        delay: delay / 1000
      }}
    >
      {featured && <div className="pricing-badge">Most Popular</div>}
      
      <div className="pricing-header">
        <h3 className="pricing-name">{tier.name}</h3>
        <div className="pricing-price">
          <span className="pricing-amount">${tier.price}</span>
          {tier.price > 0 && <span className="pricing-period">/mo</span>}
        </div>
        <p className="pricing-description">{tier.description}</p>
      </div>

      <div className="pricing-divider" />

      <ul className="pricing-features">
        {tier.features.map((feature, i) => (
          <li key={i} className="pricing-feature">
            <Check size={16} className="pricing-check" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button className={`pricing-cta btn-${tier.ctaStyle}`}>
        {tier.cta}
      </button>
    </motion.div>
  );
}

export default PricingCard;
