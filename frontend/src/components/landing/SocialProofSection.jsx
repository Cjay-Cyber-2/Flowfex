import React from 'react';
import { testimonials } from '../../data/landing/testimonials';
import TestimonialCard from './TestimonialCard';
import LogoMarquee from './LogoMarquee';

function SocialProofSection() {
  return (
    <section id="social-proof" data-section-id="social-proof" className="social-proof-section">
      <div className="radial-gradient-bg" />
      
      <div className="content-container">
        <header className="section-header">
          <span className="section-kicker">TRUSTED BY BUILDERS</span>
          <h2 className="section-headline">The people who need to see everything.</h2>
        </header>

        <LogoMarquee />

        <div className="testimonial-grid">
          {testimonials.map((testimonial, i) => (
            <TestimonialCard
              key={i}
              {...testimonial}
              delay={i * 150}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default SocialProofSection;
