import React from 'react';
import { pricingTiers } from '../../data/landing/pricing';
import PricingCard from './PricingCard';
import FeatureComparisonTable from './FeatureComparisonTable';

function PricingSection() {
  return (
    <section id="pricing" data-section-id="pricing" className="pricing-section">
      <div className="radial-glow-bg" />
      
      <div className="content-container">
        <header className="section-header">
          <span className="section-kicker">PRICING</span>
          <h2 className="section-headline">Start free. Scale when you're ready.</h2>
          <p className="section-subhead">
            No forced sign-up. No credit card for trial access. Just orchestration.
          </p>
        </header>

        <div className="pricing-cards">
          <PricingCard 
            tier={pricingTiers[0]} 
            delay={0} 
            slideFrom="left" 
          />
          <PricingCard 
            tier={pricingTiers[1]} 
            delay={200} 
            slideFrom="bottom" 
            featured 
          />
          <PricingCard 
            tier={pricingTiers[2]} 
            delay={0} 
            slideFrom="right" 
          />
        </div>

        <FeatureComparisonTable />
      </div>
    </section>
  );
}

export default PricingSection;
