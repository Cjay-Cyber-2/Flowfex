import React, { useState } from 'react';
import { faqs } from '../../data/landing/faqs';
import AccordionItem from './AccordionItem';

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" data-section-id="faq" className="faq-section">
      <div className="faq-container">
        <div className="faq-left">
          <span className="section-kicker">QUESTIONS</span>
          <h2 className="section-headline">Everything you need to know.</h2>
          <p className="faq-description">
            Can't find your answer?{' '}
            <a href="#" className="brand-link">
              Ask the agent directly
            </a>
            .
          </p>
        </div>
        
        <div className="faq-right">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
