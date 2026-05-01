# Flowfex Landing Page - GODMODE Sections
## Design Document

## Architecture Overview

This design implements the four missing landing page sections (6-9) following the GODMODE UI/UX specification to achieve Igloo/ActiveTheory production quality.

### Technology Stack
- **React 18** - Component framework
- **Framer Motion** - Advanced animations
- **Intersection Observer API** - Scroll-triggered animations
- **CSS Custom Properties** - Design tokens
- **Prism.js** - Syntax highlighting for code blocks

### Component Architecture

```
LandingPage.jsx
├── SocialProofSection.jsx
│   ├── LogoMarquee.jsx
│   └── TestimonialCard.jsx (×3)
├── DeveloperSection.jsx
│   ├── FeatureList.jsx
│   └── AnimatedCodeBlock.jsx
│       ├── CodeTabBar.jsx
│       ├── ScanLineEffect.jsx
│       └── CopyButton.jsx
├── PricingSection.jsx
│   ├── PricingCard.jsx (×3)
│   └── FeatureComparisonTable.jsx
└── FAQSection.jsx
    └── AccordionItem.jsx (×7-9)
```

---

## Section 6: Social Proof & Trust Layer

### Component: SocialProofSection.jsx

#### Layout Structure
```
<section className="social-proof-section">
  <div className="radial-gradient-bg" />
  <div className="content-container">
    <header>
      <span className="kicker">TRUSTED BY BUILDERS</span>
      <h2>The people who need to see everything.</h2>
    </header>
    <LogoMarquee />
    <div className="testimonial-grid">
      <TestimonialCard delay={0} />
      <TestimonialCard delay={150} />
      <TestimonialCard delay={300} />
    </div>
  </div>
</section>
```

#### Styling Specifications
```css
.social-proof-section {
  position: relative;
  padding: 160px 0;
  background: var(--color-void);
}

.radial-gradient-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at center,
    rgba(0, 212, 170, 0.03) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(3, 340px);
  gap: 32px;
  justify-content: center;
  margin-top: 64px;
}
```

### Component: LogoMarquee.jsx

#### Implementation Strategy
- Two rows of logos scrolling in opposite directions
- CSS animation with seamless loop
- Duplicate logo set for infinite scroll effect
- Different speeds for parallax depth

#### Animation Logic
```jsx
// Row 1: Left to right, 60s duration
// Row 2: Right to left, 75s duration
<div className="marquee-row marquee-row-1">
  <div className="marquee-content">
    {logos.concat(logos).map((logo, i) => (
      <img key={i} src={logo.src} alt={logo.name} />
    ))}
  </div>
</div>
```

#### CSS Animation
```css
@keyframes marquee-left {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes marquee-right {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}

.marquee-row-1 .marquee-content {
  animation: marquee-left 60s linear infinite;
}

.marquee-row-2 .marquee-content {
  animation: marquee-right 75s linear infinite;
}
```

### Component: TestimonialCard.jsx

#### Props Interface
```typescript
interface TestimonialCardProps {
  quote: string;
  keyPhrase: string; // Highlighted in brand color
  author: string;
  role: string;
  company: string;
  delay: number; // 0, 150, or 300ms
}
```

#### Entrance Animation
```jsx
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
```

#### Glassmorphism Styling
```css
.testimonial-card {
  width: 340px;
  padding: 32px;
  background: rgba(22, 30, 40, 0.6);
  border: 1px solid rgba(0, 212, 170, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(24px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.testimonial-card:hover {
  transform: translateY(-6px);
  border-color: rgba(0, 212, 170, 0.2);
  box-shadow: 0 12px 40px rgba(0, 212, 170, 0.15);
}
```

---

## Section 7: For Developers

### Component: DeveloperSection.jsx

#### Pinned Scroll Implementation
```jsx
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
```

#### Layout Structure
```jsx
<section ref={sectionRef} className="developer-section">
  <div className="developer-container">
    <div className="developer-left">
      <span className="kicker">FOR DEVELOPERS</span>
      <h2>Attach in minutes. Not days.</h2>
      <p>Connection model explanation...</p>
      <FeatureList scrollProgress={scrollYProgress} />
      <div className="developer-ctas">
        <button className="btn-ghost">View the Docs</button>
        <button className="btn-primary">Get API Access</button>
      </div>
    </div>
    <div className="developer-right">
      <AnimatedCodeBlock activeTab={tabIndex} />
    </div>
  </div>
</section>
```

#### Styling
```css
.developer-section {
  position: relative;
  height: 300vh; /* 200vh pin + 100vh normal */
  background: #0D1117;
  border-top: 1px solid rgba(0, 212, 170, 0.1);
}

.developer-container {
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  padding: 0 120px;
  align-items: center;
}
```

### Component: AnimatedCodeBlock.jsx

#### Tab Transition Logic
```jsx
const [currentTab, setCurrentTab] = useState(0);
const [lines, setLines] = useState([]);

useEffect(() => {
  if (activeTab !== currentTab) {
    // Fade out current lines (bottom to top)
    const fadeOut = async () => {
      for (let i = lines.length - 1; i >= 0; i--) {
        await new Promise(resolve => setTimeout(resolve, 30));
        setLines(prev => prev.map((line, idx) => 
          idx === i ? { ...line, opacity: 0 } : line
        ));
      }
    };
    
    // Fade in new lines (top to bottom)
    const fadeIn = async () => {
      const newLines = getCodeForTab(activeTab);
      for (let i = 0; i < newLines.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        setLines(prev => [...prev, { ...newLines[i], opacity: 1 }]);
      }
    };
    
    fadeOut().then(() => {
      setCurrentTab(activeTab);
      setLines([]);
      fadeIn();
    });
  }
}, [activeTab]);
```

#### Scan-Line Effect
```css
@keyframes scan-line {
  0% { top: 0; }
  100% { top: 100%; }
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(0, 212, 170, 0.1),
    transparent
  );
  animation: scan-line 4s linear infinite;
}
```

#### Copy Button State
```jsx
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(code);
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);
};

return (
  <button onClick={handleCopy} className="copy-button">
    {copied ? (
      <>
        <Check size={16} />
        <span>Copied</span>
      </>
    ) : (
      <>
        <Copy size={16} />
        <span>Copy</span>
      </>
    )}
  </button>
);
```

---

## Section 8: Pricing

### Component: PricingSection.jsx

#### Layout Structure
```jsx
<section className="pricing-section">
  <div className="radial-glow-bg" />
  <div className="pricing-container">
    <header>
      <span className="kicker">PRICING</span>
      <h2>Start free. Scale when you're ready.</h2>
      <p>No forced sign-up. No credit card for trial access.</p>
    </header>
    <div className="pricing-cards">
      <PricingCard tier="free" delay={0} slideFrom="left" />
      <PricingCard tier="pro" delay={200} slideFrom="bottom" featured />
      <PricingCard tier="team" delay={0} slideFrom="right" />
    </div>
    <FeatureComparisonTable />
  </div>
</section>
```

### Component: PricingCard.jsx

#### Props Interface
```typescript
interface PricingCardProps {
  tier: 'free' | 'pro' | 'team';
  delay: number;
  slideFrom: 'left' | 'right' | 'bottom';
  featured?: boolean;
}
```

#### Entrance Animations
```jsx
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

<motion.div
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
```

#### Featured Card Styling
```css
.pricing-card.featured {
  transform: scale(1.1);
  border: 1px solid rgba(0, 212, 170, 1);
  box-shadow: 0 0 40px rgba(0, 212, 170, 0.12);
}

.pricing-card.featured::before {
  content: 'Most Popular';
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  background: rgba(0, 212, 170, 0.2);
  border: 1px solid rgba(0, 212, 170, 0.4);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-brand);
}
```

### Component: FeatureComparisonTable.jsx

#### Table Structure
```jsx
<table className="feature-table">
  <thead>
    <tr>
      <th>Feature</th>
      <th>Free</th>
      <th>Pro</th>
      <th>Team</th>
    </tr>
  </thead>
  <tbody>
    {features.map((feature, i) => (
      <tr key={i} className={i % 2 === 0 ? 'even' : 'odd'}>
        <td>{feature.name}</td>
        <td>{feature.free ? <Check /> : <Minus />}</td>
        <td>{feature.pro ? <Check /> : <Minus />}</td>
        <td>{feature.team ? <Check /> : <Minus />}</td>
      </tr>
    ))}
  </tbody>
</table>
```

#### Styling
```css
.feature-table thead tr {
  background: rgba(0, 212, 170, 0.08);
}

.feature-table tbody tr.even {
  background: rgba(22, 30, 40, 0.3);
}

.feature-table tbody tr.odd {
  background: rgba(22, 30, 40, 0.6);
}

.feature-table td {
  padding: 16px 24px;
  border: none;
}

.feature-table .check-icon {
  color: var(--color-brand);
}

.feature-table .minus-icon {
  color: var(--color-text-muted);
}
```

---

## Section 9: FAQ

### Component: FAQSection.jsx

#### Layout Structure
```jsx
<section className="faq-section">
  <div className="faq-container">
    <div className="faq-left">
      <span className="kicker">QUESTIONS</span>
      <h2>Everything you need to know.</h2>
      <p>
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
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  </div>
</section>
```

#### Sticky Column
```css
.faq-container {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 120px;
  padding: 160px 120px;
}

.faq-left {
  position: sticky;
  top: 120px;
  height: fit-content;
}
```

### Component: AccordionItem.jsx

#### Props Interface
```typescript
interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}
```

#### Animation Implementation
```jsx
<motion.div className="accordion-item">
  <button 
    className="accordion-header"
    onClick={onToggle}
  >
    <span>{question}</span>
    <motion.div
      animate={{ rotate: isOpen ? 45 : 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="accordion-icon"
    >
      <Plus size={20} />
    </motion.div>
  </button>
  
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="accordion-content"
      >
        <p>{answer}</p>
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

#### Styling
```css
.accordion-item {
  border-bottom: 1px solid rgba(232, 237, 242, 0.06);
}

.accordion-item.is-open {
  border-left: 2px solid rgba(0, 212, 170, 0.4);
  padding-left: 22px;
  margin-left: -24px;
}

.accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 24px 0;
  background: none;
  border: none;
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: color 0.2s;
}

.accordion-header:hover {
  color: var(--color-brand);
}

.accordion-content {
  overflow: hidden;
}

.accordion-content p {
  padding-bottom: 24px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-muted);
}
```

---

## Data Structures

### Logo Marquee Data
```javascript
const logos = [
  { name: 'VS Code', src: '/logos/vscode.svg' },
  { name: 'Cursor', src: '/logos/cursor.svg' },
  { name: 'Claude', src: '/logos/claude.svg' },
  { name: 'OpenAI', src: '/logos/openai.svg' },
  { name: 'Anthropic', src: '/logos/anthropic.svg' },
  { name: 'LangChain', src: '/logos/langchain.svg' },
  { name: 'AutoGPT', src: '/logos/autogpt.svg' },
  { name: 'Vercel', src: '/logos/vercel.svg' }
];
```

### Testimonial Data
```javascript
const testimonials = [
  {
    quote: "Flowfex changed how we build with AI. We can finally see what our agents are doing in real-time.",
    keyPhrase: "see what our agents are doing",
    author: "Sarah Chen",
    role: "Engineering Lead",
    company: "Anthropic"
  },
  {
    quote: "The approval system gives us the control we need without slowing down execution.",
    keyPhrase: "control we need",
    author: "Marcus Rodriguez",
    role: "CTO",
    company: "Scale AI"
  },
  {
    quote: "Integration took 5 minutes. We were orchestrating complex workflows by lunch.",
    keyPhrase: "5 minutes",
    author: "Emily Park",
    role: "Senior Developer",
    company: "OpenAI"
  }
];
```

### Code Snippets
```javascript
const codeSnippets = {
  prompt: `You are connected to Flowfex orchestration.

When you need approval for a decision:
1. Explain your reasoning
2. List alternatives you considered
3. Wait for operator approval

All your actions will be visible in the live graph.`,
  
  javascript: `import { Flowfex } from '@flowfex/sdk';

const flowfex = new Flowfex({
  apiKey: process.env.FLOWFEX_API_KEY
});

// Connect your agent
await flowfex.connect({
  name: 'My Agent',
  mode: 'live'
});`,
  
  python: `from flowfex import Flowfex

flowfex = Flowfex(
    api_key=os.getenv('FLOWFEX_API_KEY')
)

# Connect your agent
await flowfex.connect(
    name='My Agent',
    mode='live'
)`
};
```

### Pricing Data
```javascript
const pricingTiers = [
  {
    name: 'Free',
    price: 0,
    description: 'For trying out Flowfex',
    features: [
      '100 orchestration steps/month',
      '1 connected agent',
      'Map & Flow modes',
      'Community support'
    ],
    cta: 'Start Free',
    ctaStyle: 'ghost'
  },
  {
    name: 'Pro',
    price: 49,
    description: 'For professional developers',
    features: [
      'Unlimited orchestration steps',
      'Unlimited agents',
      'All modes (Map, Flow, Live)',
      'Priority support',
      'Advanced analytics',
      'Team collaboration'
    ],
    cta: 'Start Pro Trial',
    ctaStyle: 'primary',
    featured: true
  },
  {
    name: 'Team',
    price: 199,
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'SSO & SAML',
      'Audit logs',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    cta: 'Contact Sales',
    ctaStyle: 'secondary'
  }
];
```

### FAQ Data
```javascript
const faqs = [
  {
    question: 'What agents does Flowfex work with?',
    answer: 'Flowfex works with any agent framework or custom agent. Connect via prompt, SDK, link, or live socket. We support Claude, GPT-4, AutoGPT, LangChain, and custom implementations.'
  },
  {
    question: 'How does the prompt connection work?',
    answer: 'Simply paste our connection prompt into your agent\'s system instructions. The agent will automatically report its actions to Flowfex, creating a live visualization of its execution.'
  },
  {
    question: 'Is sign-up required?',
    answer: 'No! You can start an anonymous session immediately. Sign up later to save your sessions and access advanced features.'
  },
  {
    question: 'What happens when the trial limit is reached?',
    answer: 'Your sessions are saved and you can view them anytime. Upgrade to Pro to continue orchestrating with unlimited steps.'
  },
  {
    question: 'How does the SDK compare to prompt connection?',
    answer: 'The SDK provides more control and real-time streaming. Prompt connection is simpler but slightly delayed. Both create the same visualization.'
  },
  {
    question: 'Is team collaboration supported?',
    answer: 'Yes! Pro and Team plans include real-time collaboration, shared sessions, and team analytics.'
  },
  {
    question: 'What\'s the difference between Map, Flow, and Live modes?',
    answer: 'Map shows the full execution graph. Flow highlights the active path. Live mode shows only what\'s currently executing. Switch between them anytime.'
  }
];
```

---

## Performance Optimizations

### Lazy Loading
```jsx
const SocialProofSection = lazy(() => import('./SocialProofSection'));
const DeveloperSection = lazy(() => import('./DeveloperSection'));
const PricingSection = lazy(() => import('./PricingSection'));
const FAQSection = lazy(() => import('./FAQSection'));

// In LandingPage.jsx
<Suspense fallback={<SectionSkeleton />}>
  <SocialProofSection />
  <DeveloperSection />
  <PricingSection />
  <FAQSection />
</Suspense>
```

### Intersection Observer
```jsx
const useSectionInView = (threshold = 0.2) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );
    
    if (ref.current) observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return [ref, inView];
};
```

### Animation Performance
```css
/* Use transform and opacity only for 60fps */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU acceleration */
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Testing Strategy

### Visual Regression Tests
- Screenshot comparison for each section
- Test at 1440px, 1280px, 1024px breakpoints
- Verify animations at key frames

### Performance Tests
- Lighthouse score 90+ for performance
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Cumulative Layout Shift < 0.1

### Accessibility Tests
- Keyboard navigation through all interactive elements
- Screen reader compatibility
- ARIA labels present and correct
- Focus states visible

### Cross-Browser Tests
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

---

## Implementation Notes

### Critical Path
1. Implement Section 6 (Social Proof) first - simplest, establishes patterns
2. Implement Section 8 (Pricing) second - reuses card patterns
3. Implement Section 9 (FAQ) third - accordion component
4. Implement Section 7 (Developer) last - most complex with pinned scroll

### Code Organization
```
frontend/src/
├── components/
│   └── landing/
│       ├── SocialProofSection.jsx
│       ├── LogoMarquee.jsx
│       ├── TestimonialCard.jsx
│       ├── DeveloperSection.jsx
│       ├── AnimatedCodeBlock.jsx
│       ├── PricingSection.jsx
│       ├── PricingCard.jsx
│       ├── FeatureComparisonTable.jsx
│       ├── FAQSection.jsx
│       └── AccordionItem.jsx
├── styles/
│   └── landing/
│       ├── social-proof.css
│       ├── developer.css
│       ├── pricing.css
│       └── faq.css
└── data/
    └── landing/
        ├── testimonials.js
        ├── logos.js
        ├── pricing.js
        └── faqs.js
```

### Dependencies to Add
```json
{
  "dependencies": {
    "framer-motion": "^10.16.4",
    "prismjs": "^1.29.0",
    "react-intersection-observer": "^9.5.3"
  }
}
```

---

## Success Criteria

### Visual Quality
- ✅ Matches GODMODE spec pixel-perfect
- ✅ All animations smooth at 60fps
- ✅ Glassmorphism effects render correctly
- ✅ Brand colors used at correct opacities

### Interaction Quality
- ✅ Hover states feel responsive (150-200ms)
- ✅ Scroll-driven animations trigger at right moments
- ✅ Accordion expands/collapses smoothly
- ✅ Copy buttons provide clear feedback

### Performance Quality
- ✅ Lighthouse score 90+
- ✅ No layout shifts
- ✅ Lazy loading working
- ✅ Code splitting effective

### Accessibility Quality
- ✅ WCAG AA compliant
- ✅ Keyboard navigation complete
- ✅ Screen reader friendly
- ✅ Reduced motion respected

---

This design achieves Igloo/ActiveTheory production quality through:
1. **Attention to detail** - Every animation timing, easing curve, and opacity value matches the spec
2. **Performance first** - GPU acceleration, lazy loading, code splitting
3. **Accessibility built-in** - ARIA labels, keyboard nav, reduced motion
4. **Smooth interactions** - Framer Motion for buttery animations
5. **Clean architecture** - Reusable components, clear data structures

Ready for implementation. 🚀

