import React from 'react';
import { motion } from 'framer-motion';

function TestimonialCard({ quote, keyPhrase, author, role, company, delay = 0 }) {
  // Split quote to highlight key phrase
  const parts = quote.split(keyPhrase);
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1],
        delay: delay / 1000
      }
    }
  };

  return (
    <motion.div
      className="testimonial-card"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Five-star row */}
      <div className="testimonial-stars">
        {[...Array(5)].map((_, i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0l2.163 5.163L16 6.063l-4 3.5 1.163 5.437L8 12.163 2.837 15 4 9.563 0 6.063l5.837-.9L8 0z" />
          </svg>
        ))}
      </div>

      {/* Quote with highlighted key phrase */}
      <blockquote className="testimonial-quote">
        {parts[0]}
        <span className="testimonial-highlight">{keyPhrase}</span>
        {parts[1]}
      </blockquote>

      {/* Author info */}
      <div className="testimonial-author">
        <div className="testimonial-name">{author}</div>
        <div className="testimonial-role">
          {role} · {company}
        </div>
      </div>
    </motion.div>
  );
}

export default TestimonialCard;
