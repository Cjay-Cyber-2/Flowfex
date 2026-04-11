# Flowfex Landing Page - GODMODE Sections
## Requirements Document

## Overview
Implement the missing landing page sections (6-9) to achieve Igloo/ActiveTheory production quality level, following the complete UI/UX GODMODE specification.

## User Stories

### As a visitor to the Flowfex landing page
- I want to see social proof from trusted companies so I feel confident using the product
- I want to see how developers integrate Flowfex so I understand the technical approach
- I want to understand pricing options so I can plan my usage
- I want answers to common questions so I don't have to contact support

## Functional Requirements

### FR-1: Social Proof Section (Section 6)
**Priority**: High

#### FR-1.1: Logo Marquee
- Display continuous horizontal scrolling strip of company/tool logos
- Two rows scrolling in opposite directions at different speeds
- Logos at 30% opacity, brighten to 100% on hover with brand glow
- Seamless CSS animation loop
- Barely perceptible movement speed

#### FR-1.2: Testimonial Cards
- Three glass cards in a row, 340px wide each
- Each card contains:
  - Five-star row (brand color, 60% opacity)
  - Pull quote (Syne 18px, key phrase in brand color)
  - Person's name (Inter 14px weight 600)
  - Role and company (Inter 13px muted)
- Staggered entrance on scroll (0ms, 150ms, 300ms delays)
- Slide up from 20px offset while fading in
- Hover: elevate 6px, border brightens, brand glow appears

#### FR-1.3: Background Treatment
- Subtle radial gradient (brand color 3% opacity at peak)
- Fades to void at edges
- Creates warmth around content

### FR-2: For Developers Section (Section 7)
**Priority**: High

#### FR-2.1: Pinned Scroll Behavior
- Section pins for 200vh of scroll
- Internal scroll drives code block transitions
- Smooth scroll-driven animations

#### FR-2.2: Two-Column Layout
- Left column: Text narrative and feature list
- Right column: Animated code/terminal block
- Equal width columns

#### FR-2.3: Left Column Content
- Small caps label: "FOR DEVELOPERS"
- Headline: "Attach in minutes. Not days."
- Body paragraph explaining connection model
- Four feature rows with checkmarks:
  1. "Prompt-based attach — paste one line into any agent"
  2. "SDK for JavaScript and Python"
  3. "Live socket connection for streaming agents"
  4. "Zero lock-in — works with any agent framework"
- Sequential appearance on scroll (slide from left with fade)
- Two CTAs: "View the Docs" (ghost) + "Get API Access" (filled)

#### FR-2.4: Animated Code Block
- Terminal-style dark panel
- Tab bar with three tabs: Prompt, JavaScript, Python
- Active tab underlined with brand color
- Syntax highlighting (brand color for strings/comments)
- Copy button (transforms to checkmark for 1.5s)
- Scan-line animation (4-second loop)

#### FR-2.5: Code Tab Transitions
- Line-by-line fade out (bottom to top, 30ms stagger)
- Line-by-line fade in (top to bottom, 30ms stagger)
- Feels like terminal rewriting itself

### FR-3: Pricing Section (Section 8)
**Priority**: High

#### FR-3.1: Three Pricing Cards
- Free, Pro, Team tiers
- Pro card 10% taller than others
- Pro card has:
  - Brand-color border (1px, 100% opacity)
  - Outer glow: box-shadow: 0 0 40px rgba(0,229,195,0.12)
  - "Most Popular" badge in top-right

#### FR-3.2: Card Content
Each card contains:
- Plan name (Syne 20px weight 700)
- Price (Syne 48px weight 800) + "/mo" (Inter 16px muted)
- One-line description (Inter 14px muted)
- Horizontal divider
- Feature list with checkmarks
- CTA button (Free: ghost, Pro: filled brand, Team: filled alt)

#### FR-3.3: Card Entrance Animation
- Outer two cards slide in from sides simultaneously
- Center Pro card rises from below with 200ms delay
- Pro card arrives last, settling as dominant element

#### FR-3.4: Feature Comparison Table
- Rows for each feature, columns for each tier
- Alternating row fills (3% lightness difference)
- Checkmarks (brand color) for included features
- Dash marks (muted) for excluded features
- Header row: brand color background 8% opacity
- No visible grid lines (separation via fills and row height)

### FR-4: FAQ Section (Section 9)
**Priority**: Medium

#### FR-4.1: Two-Column Layout
- Left column: Sticky text block
- Right column: Accordion list

#### FR-4.2: Left Column (Sticky)
- Small caps label: "QUESTIONS"
- Headline: "Everything you need to know."
- Body text with brand-color link

#### FR-4.3: Accordion Component
- 7-9 FAQ items
- Each item: question + plus icon
- Click to expand (300ms ease-out height animation)
- Plus icon rotates 45° to become X
- Expanded row gets brand-color left border (2px, 40% opacity)
- Only one item open at a time
- Smooth collapse animation when opening new item

#### FR-4.4: FAQ Content
Questions include:
- What agents does Flowfex work with?
- How does the prompt connection work?
- Is sign-up required?
- What happens when trial limit is reached?
- How does SDK compare to prompt connection?
- Is team collaboration supported?
- What's the difference between Map, Flow, and Live modes?

## Non-Functional Requirements

### NFR-1: Performance
- All animations maintain 60fps
- Scroll-driven animations use requestAnimationFrame
- Lazy load sections below fold
- Code splitting for heavy components

### NFR-2: Accessibility
- WCAG AA contrast ratios
- Keyboard navigation for all interactive elements
- ARIA labels on accordions and tabs
- Focus management in modals
- Screen reader compatible

### NFR-3: Responsiveness
- Desktop (1440px+): Full experience
- Laptop (1280-1439px): Adapted layouts
- Tablet (1024-1279px): Stacked layouts
- Mobile (768px-1023px): Single column

### NFR-4: Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Acceptance Criteria

### AC-1: Social Proof Section
- [ ] Logo marquee scrolls continuously in two rows
- [ ] Logos brighten on hover with brand glow
- [ ] Three testimonial cards display correctly
- [ ] Cards enter with staggered timing (0, 150ms, 300ms)
- [ ] Cards elevate on hover with glow effect
- [ ] Background radial gradient visible but subtle

### AC-2: For Developers Section
- [ ] Section pins for 200vh of scroll
- [ ] Code block transitions between tabs on scroll
- [ ] Line-by-line fade animations work smoothly
- [ ] Scan-line animation loops continuously
- [ ] Copy button transforms to checkmark
- [ ] Feature rows appear sequentially on scroll
- [ ] Both CTAs are functional

### AC-3: Pricing Section
- [ ] Three pricing cards display correctly
- [ ] Pro card is 10% taller with glow
- [ ] "Most Popular" badge appears on Pro card
- [ ] Cards enter with correct animation sequence
- [ ] Feature comparison table displays correctly
- [ ] Alternating row fills visible
- [ ] Checkmarks and dashes render correctly

### AC-4: FAQ Section
- [ ] Left column stays sticky while right scrolls
- [ ] Accordion items expand/collapse smoothly
- [ ] Plus icon rotates to X on expand
- [ ] Only one item open at a time
- [ ] Expanded item shows brand-color left border
- [ ] All 7-9 FAQ items present with content

### AC-5: Overall Quality
- [ ] All animations run at 60fps
- [ ] No layout shifts or jank
- [ ] Keyboard navigation works throughout
- [ ] Focus states visible and styled
- [ ] Reduced motion respected
- [ ] Lighthouse score 90+ for performance

## Out of Scope
- Backend integration for pricing/checkout
- Real testimonial data (using placeholder content)
- Analytics tracking
- A/B testing variants
- Internationalization

## Dependencies
- Framer Motion for animations
- Intersection Observer API for scroll triggers
- CSS backdrop-filter support
- Modern browser with ES6+ support

## Risks & Mitigations

### Risk 1: Pinned scroll performance
**Mitigation**: Use CSS position: sticky where possible, optimize scroll listeners with throttling

### Risk 2: Complex animations causing jank
**Mitigation**: Use transform and opacity only, leverage GPU acceleration, test on mid-range devices

### Risk 3: Accordion height animations
**Mitigation**: Use Framer Motion's AnimatePresence, measure content height dynamically

## Success Metrics
- Lighthouse performance score: 90+
- Time to Interactive: <3 seconds
- First Contentful Paint: <1.5 seconds
- Cumulative Layout Shift: <0.1
- User engagement: 60%+ scroll to pricing section

## Timeline Estimate
- Section 6 (Social Proof): 4 hours
- Section 7 (For Developers): 6 hours
- Section 8 (Pricing): 4 hours
- Section 9 (FAQ): 3 hours
- Testing & Polish: 3 hours
- **Total**: 20 hours

## Notes
This spec focuses on the four missing landing page sections. The canvas animations and approvals queue are already production-ready. Dashboard enhancements will be addressed in a separate spec.

