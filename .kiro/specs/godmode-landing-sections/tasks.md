# Flowfex Landing Page - GODMODE Sections
## Implementation Tasks

## Task 1: Setup and Dependencies

### 1.1 Install Required Dependencies
- [ ] Install framer-motion: `npm install framer-motion`
- [ ] Install prismjs for syntax highlighting: `npm install prismjs`
- [ ] Install react-intersection-observer: `npm install react-intersection-observer`
- [ ] Verify all dependencies in package.json

### 1.2 Create Directory Structure
- [ ] Create `frontend/src/components/landing/` directory
- [ ] Create `frontend/src/styles/landing/` directory
- [ ] Create `frontend/src/data/landing/` directory

### 1.3 Create Data Files
- [ ] Create `frontend/src/data/landing/testimonials.js` with testimonial data
- [ ] Create `frontend/src/data/landing/logos.js` with logo data
- [ ] Create `frontend/src/data/landing/pricing.js` with pricing tiers
- [ ] Create `frontend/src/data/landing/faqs.js` with FAQ items
- [ ] Create `frontend/src/data/landing/codeSnippets.js` with code examples

---

## Task 2: Section 6 - Social Proof & Trust Layer

### 2.1 Create TestimonialCard Component
- [ ] Create `frontend/src/components/landing/TestimonialCard.jsx`
- [ ] Implement props interface (quote, keyPhrase, author, role, company, delay)
- [ ] Add glassmorphism styling
- [ ] Implement entrance animation with Framer Motion
- [ ] Add hover effect (elevate 6px, border brighten, glow)
- [ ] Highlight key phrase in brand color
- [ ] Add five-star row at 60% opacity

### 2.2 Create LogoMarquee Component
- [ ] Create `frontend/src/components/landing/LogoMarquee.jsx`
- [ ] Implement two-row layout
- [ ] Add CSS animations for continuous scroll
- [ ] Row 1: left to right, 60s duration
- [ ] Row 2: right to left, 75s duration
- [ ] Duplicate logo arrays for seamless loop
- [ ] Add hover effect (brighten to 100%, brand glow)
- [ ] Set default opacity to 30%

### 2.3 Create SocialProofSection Component
- [ ] Create `frontend/src/components/landing/SocialProofSection.jsx`
- [ ] Add radial gradient background (brand color 3% opacity)
- [ ] Implement headline block with kicker
- [ ] Integrate LogoMarquee component
- [ ] Create three-column testimonial grid (340px cards)
- [ ] Add staggered entrance (0ms, 150ms, 300ms delays)
- [ ] Implement scroll-triggered animation with Intersection Observer

### 2.4 Create Styling
- [ ] Create `frontend/src/styles/landing/social-proof.css`
- [ ] Style section container with padding
- [ ] Style radial gradient overlay
- [ ] Style testimonial grid layout
- [ ] Style logo marquee rows
- [ ] Add responsive breakpoints

---

## Task 3: Section 8 - Pricing (Implement Before Section 7)

### 3.1 Create PricingCard Component
- [ ] Create `frontend/src/components/landing/PricingCard.jsx`
- [ ] Implement props interface (tier, delay, slideFrom, featured)
- [ ] Add card content structure (name, price, description, features, CTA)
- [ ] Implement entrance animations (left, right, bottom variants)
- [ ] Add featured card styling (10% taller, border, glow, badge)
- [ ] Style "Most Popular" badge
- [ ] Add hover effects
- [ ] Implement CTA button variants (ghost, primary, secondary)

### 3.2 Create FeatureComparisonTable Component
- [ ] Create `frontend/src/components/landing/FeatureComparisonTable.jsx`
- [ ] Implement table structure (thead, tbody)
- [ ] Add alternating row fills (3% lightness difference)
- [ ] Style header row (brand color 8% opacity)
- [ ] Add checkmark icons for included features
- [ ] Add dash icons for excluded features
- [ ] Remove grid lines (use fills for separation)
- [ ] Add generous row height

### 3.3 Create PricingSection Component
- [ ] Create `frontend/src/components/landing/PricingSection.jsx`
- [ ] Add radial glow background (brand color 2% opacity)
- [ ] Implement headline block
- [ ] Create three-card pricing row
- [ ] Integrate PricingCard components with correct delays
- [ ] Integrate FeatureComparisonTable below cards
- [ ] Implement scroll-triggered animations

### 3.4 Create Styling
- [ ] Create `frontend/src/styles/landing/pricing.css`
- [ ] Style section container
- [ ] Style pricing cards grid
- [ ] Style feature comparison table
- [ ] Add responsive breakpoints

---

## Task 4: Section 9 - FAQ

### 4.1 Create AccordionItem Component
- [ ] Create `frontend/src/components/landing/AccordionItem.jsx`
- [ ] Implement props interface (question, answer, isOpen, onToggle)
- [ ] Add accordion header with question and plus icon
- [ ] Implement AnimatePresence for smooth height animation
- [ ] Add icon rotation (0° to 45° on expand)
- [ ] Add brand-color left border when expanded (2px, 40% opacity)
- [ ] Style content area with proper padding
- [ ] Add transition timing (300ms ease-out)

### 4.2 Create FAQSection Component
- [ ] Create `frontend/src/components/landing/FAQSection.jsx`
- [ ] Implement two-column layout (400px left, 1fr right)
- [ ] Make left column sticky (top: 120px)
- [ ] Add headline block with kicker
- [ ] Add brand-color link in description
- [ ] Integrate AccordionItem components
- [ ] Implement single-open logic (close others when opening new)
- [ ] Add state management for openIndex

### 4.3 Create Styling
- [ ] Create `frontend/src/styles/landing/faq.css`
- [ ] Style two-column grid layout
- [ ] Style sticky left column
- [ ] Style accordion items
- [ ] Style accordion header
- [ ] Style accordion content
- [ ] Add border styling
- [ ] Add responsive breakpoints

---

## Task 5: Section 7 - For Developers (Most Complex)

### 5.1 Create AnimatedCodeBlock Component
- [ ] Create `frontend/src/components/landing/AnimatedCodeBlock.jsx`
- [ ] Implement tab bar (Prompt, JavaScript, Python)
- [ ] Add active tab underline (brand color)
- [ ] Implement line-by-line fade out animation (bottom to top, 30ms stagger)
- [ ] Implement line-by-line fade in animation (top to bottom, 30ms stagger)
- [ ] Add syntax highlighting with Prism.js
- [ ] Highlight strings and comments in brand color
- [ ] Add scan-line effect (4-second loop)
- [ ] Create CopyButton component with state transition
- [ ] Implement copy to clipboard functionality
- [ ] Add checkmark transformation (1.5s duration)

### 5.2 Create FeatureList Component
- [ ] Create `frontend/src/components/landing/FeatureList.jsx`
- [ ] Implement four feature rows with checkmarks
- [ ] Add scroll-driven sequential appearance
- [ ] Slide in from left with fade
- [ ] Use scrollYProgress to trigger animations
- [ ] Style checkmark icons (thin, brand color)

### 5.3 Create DeveloperSection Component
- [ ] Create `frontend/src/components/landing/DeveloperSection.jsx`
- [ ] Implement pinned scroll behavior (200vh)
- [ ] Set up useScroll hook with proper offsets
- [ ] Create two-column equal layout
- [ ] Add left column content (kicker, headline, body, features, CTAs)
- [ ] Integrate AnimatedCodeBlock in right column
- [ ] Map scrollYProgress to tab index (0-2)
- [ ] Add background color (#0D1117)
- [ ] Add top border (brand color 10% opacity)

### 5.4 Create Styling
- [ ] Create `frontend/src/styles/landing/developer.css`
- [ ] Style pinned section (height: 300vh)
- [ ] Style sticky container (position: sticky, top: 0)
- [ ] Style two-column grid
- [ ] Style code block terminal appearance
- [ ] Style tab bar
- [ ] Style scan-line animation
- [ ] Style copy button states
- [ ] Add responsive breakpoints

---

## Task 6: Integration with Landing Page

### 6.1 Update LandingPage Component
- [x] Import all new section components
- [x] Add lazy loading with React.lazy()
- [x] Add Suspense with loading fallback
- [ ] Insert sections in correct order:
  - Hero
  - Feature sections (existing)
  - **Section 6: Social Proof** (new)
  - **Section 7: For Developers** (new)
  - **Section 8: Pricing** (new)
  - **Section 9: FAQ** (new)
  - Final CTA (existing)
  - Footer

### 6.2 Update Landing Page Styles
- [ ] Import all new section stylesheets
- [ ] Ensure consistent spacing between sections
- [ ] Verify scroll behavior is smooth
- [ ] Test section transitions

---

## Task 7: Enhance Final CTA Section

### 7.1 Add Canvas Background
- [ ] Add dimmed canvas background (15% opacity)
- [ ] Add 2px blur to canvas
- [ ] Ensure canvas plays on slow ambient loop
- [ ] Position canvas absolutely behind content

### 7.2 Enhance CTA Button
- [ ] Update button size to 56px × 220px
- [ ] Implement breathing glow animation (3s ease-in-out loop)
- [ ] Glow cycles between 0 and `0 0 30px rgba(0,229,195,0.35)`
- [ ] Ensure button text is Syne 17px weight 700

### 7.3 Update Headline
- [ ] Ensure headline is Syne 72px weight 800
- [ ] Highlight "See" in brand color with text glow
- [ ] Rest of text in muted neutral

### 7.4 Add Trust Line
- [ ] Add small text below button (Inter 12px muted)
- [ ] Content: "No credit card required · Anonymous session · Upgrade when ready"

---

## Task 8: Performance Optimization

### 8.1 Implement Lazy Loading
- [ ] Wrap sections in React.lazy()
- [ ] Add Suspense boundaries
- [ ] Create skeleton loading states
- [ ] Test lazy loading behavior

### 8.2 Optimize Animations
- [ ] Ensure all animations use transform and opacity only
- [ ] Add will-change hints where appropriate
- [ ] Force GPU acceleration with translateZ(0)
- [ ] Test animations maintain 60fps

### 8.3 Add Intersection Observers
- [ ] Implement custom useInView hook
- [ ] Apply to all scroll-triggered animations
- [ ] Set appropriate thresholds
- [ ] Test trigger points

### 8.4 Code Splitting
- [ ] Verify route-based code splitting
- [ ] Check bundle sizes
- [ ] Optimize imports
- [ ] Test production build

---

## Task 9: Accessibility

### 9.1 Add ARIA Labels
- [ ] Add aria-label to all icon buttons
- [ ] Add aria-expanded to accordion items
- [ ] Add aria-hidden to decorative elements
- [ ] Add role attributes where needed

### 9.2 Keyboard Navigation
- [ ] Test tab order through all sections
- [ ] Ensure accordion items are keyboard accessible
- [ ] Test pricing card CTAs with keyboard
- [ ] Verify focus states are visible

### 9.3 Reduced Motion
- [ ] Add prefers-reduced-motion media query
- [ ] Disable animations when reduced motion is preferred
- [ ] Test with reduced motion enabled
- [ ] Ensure content is still accessible

### 9.4 Screen Reader Testing
- [ ] Test with NVDA/JAWS
- [ ] Verify all content is announced
- [ ] Check heading hierarchy
- [ ] Test interactive elements

---

## Task 10: Testing & Quality Assurance

### 10.1 Visual Testing
- [ ] Test at 1440px (canonical)
- [ ] Test at 1280px (laptop)
- [ ] Test at 1024px (tablet)
- [ ] Test at 768px (mobile)
- [ ] Verify all animations trigger correctly
- [ ] Check glassmorphism effects render properly
- [ ] Verify brand colors at correct opacities

### 10.2 Cross-Browser Testing
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Document any browser-specific issues
- [ ] Add polyfills if needed

### 10.3 Performance Testing
- [ ] Run Lighthouse audit (target 90+)
- [ ] Check First Contentful Paint (<1.5s)
- [ ] Check Time to Interactive (<3s)
- [ ] Check Cumulative Layout Shift (<0.1)
- [ ] Profile animation performance
- [ ] Check memory usage

### 10.4 Accessibility Testing
- [ ] Run axe DevTools audit
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify WCAG AA compliance
- [ ] Check color contrast ratios
- [ ] Test reduced motion

---

## Task 11: Documentation

### 11.1 Component Documentation
- [ ] Add JSDoc comments to all components
- [ ] Document props interfaces
- [ ] Add usage examples
- [ ] Document animation timings

### 11.2 Update README
- [ ] Document new sections
- [ ] Add screenshots
- [ ] Update feature list
- [ ] Add performance metrics

### 11.3 Create Style Guide
- [ ] Document animation patterns
- [ ] Document color usage
- [ ] Document typography scale
- [ ] Document spacing system

---

## Task 12: Final Polish

### 12.1 Animation Refinement
- [ ] Fine-tune easing curves
- [ ] Adjust animation durations
- [ ] Perfect stagger timings
- [ ] Test animation sequences

### 12.2 Visual Refinement
- [ ] Adjust spacing for perfect alignment
- [ ] Fine-tune glassmorphism effects
- [ ] Perfect hover states
- [ ] Verify brand color consistency

### 12.3 Interaction Refinement
- [ ] Perfect button press states
- [ ] Smooth all transitions
- [ ] Add loading states
- [ ] Perfect focus states

### 12.4 Final Review
- [ ] Review against GODMODE spec
- [ ] Check all acceptance criteria
- [ ] Verify Igloo/ActiveTheory quality level
- [ ] Get stakeholder approval

---

## Estimated Timeline

- **Task 1**: Setup (1 hour)
- **Task 2**: Social Proof Section (4 hours)
- **Task 3**: Pricing Section (4 hours)
- **Task 4**: FAQ Section (3 hours)
- **Task 5**: Developer Section (6 hours)
- **Task 6**: Integration (1 hour)
- **Task 7**: Final CTA Enhancement (1 hour)
- **Task 8**: Performance Optimization (2 hours)
- **Task 9**: Accessibility (2 hours)
- **Task 10**: Testing & QA (3 hours)
- **Task 11**: Documentation (1 hour)
- **Task 12**: Final Polish (2 hours)

**Total: 30 hours**

---

## Success Criteria

All tasks complete when:
- ✅ All four sections implemented and integrated
- ✅ All animations smooth at 60fps
- ✅ Lighthouse score 90+
- ✅ WCAG AA compliant
- ✅ Cross-browser compatible
- ✅ Matches GODMODE spec pixel-perfect
- ✅ Igloo/ActiveTheory quality level achieved

---

## Notes

- Implement in order: Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12
- Test each section thoroughly before moving to next
- Commit after each major task completion
- Get feedback early and often
- Prioritize performance and accessibility throughout

Ready to execute! 🚀

