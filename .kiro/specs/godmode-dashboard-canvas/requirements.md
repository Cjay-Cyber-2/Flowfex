# GODMODE FLOWFEX — Dashboard Canvas Requirements
## Part 3 of 3: The Center Canvas Deep Specification

---

## Vision Statement

**"A person sitting in a dark room in front of a glowing interface, watching something think."**

The canvas is not a diagram tool. It is not a flowchart editor. It is a **window into intelligence** — where AI orchestration becomes visible, controllable, and beautiful. Every interaction must feel like witnessing thought itself.

**Quality Bar**: Active Theory / Igloo level production quality.

---

## User Stories

### US-1: Canvas Foundation
**As a** user watching AI orchestration  
**I want** an infinite, structured void with subtle depth  
**So that** I feel like I'm navigating through a living intelligence space

**Acceptance Criteria**:
- Canvas fills 100% of space between panels
- 5-layer rendering system (base → dot grid → ambient gradient → graph → UI overlays)
- Base fill: #080C10 (deepest void)
- Dot grid: 1px dots, 24px spacing, rgba(232,237,242,0.04), fixed (doesn't zoom)
- Ambient gradient: radial rgba(0,229,195,0.015) when agent active
- Smooth pan with momentum-based inertia
- Zoom range 30%-200% with cursor-centered zooming
- 150ms ease-out zoom transitions

### US-2: Node Architecture
**As a** user inspecting orchestration flow  
**I want** nodes that communicate their state through color, animation, and glow  
**So that** I can understand what's happening at a glance

**Acceptance Criteria**:
- Base node: 160px × 72px, border-radius 10px, #111820 background
- 7 distinct states: Idle, Queued, Executing, Awaiting Approval, Completed, Rejected, Selected
- Executing state: rotating arc animation (2.5s loop), brand-color glow
- Awaiting approval: breathing border (1.8s loop), hand/lock badge
- Diamond decision nodes: 80px × 80px rotated 45°
- Node content: 20px icon, primary label (Inter 14px 600), secondary label (Inter 11px 400)
- Type badge: 6px × 6px colored square (visible at 70%+ zoom)
- Hover: border transitions to rgba(0,229,195,0.4) in 150ms
- Selection: 2px brand border, elevated shadow, right panel updates

### US-3: Edge Architecture
**As a** user following execution paths  
**I want** edges that show active flow with traveling light pulses  
**So that** I can see intelligence moving through the system

**Acceptance Criteria**:
- SVG cubic bezier curves, 1.5px thickness at rest
- Filled arrowheads: 8px × 6px, aligned to edge direction
- Active edges: rgba(0,229,195,0.8) with outer glow
- Traveling pulse dots: 4px diameter, 1.2s journey, ease-in-out
- Multiple pulses independently timed (organic, not synchronized)
- Completed edges: rgba(0,229,195,0.22), no animation
- Branching edges: condition labels in dark pills
- Hover: thickness increases to 2.5px, tooltip shows source/target

### US-4: Canvas Interactions
**As a** user manipulating the graph  
**I want** intuitive pan, zoom, and selection controls  
**So that** I can navigate and inspect with precision

**Acceptance Criteria**:
- Click-drag to pan (grab cursor, momentum deceleration)
- Scroll wheel zoom (cursor-centered)
- Node selection: click node → brand border + right panel update
- Multi-select: Shift+click or drag selection rectangle
- Edge hover: highlight + tooltip pill
- Keyboard shortcuts: Space+drag (pan), Cmd+scroll (zoom), M/F/L (mode switch)
- Escape to deselect
- Click empty canvas to deselect

### US-5: Canvas Bottom Toolbar
**As a** user working with the canvas  
**I want** quick access to tools and view controls  
**So that** I can efficiently manipulate the workspace

**Acceptance Criteria**:
- Floating pill: 280px × 40px, centered, 20px from bottom
- Background: rgba(13,17,23,0.92), 16px backdrop blur
- 7 icon buttons: Selection, Pan, Add Node, Add Annotation, Fit to View, Minimap, Fullscreen
- Icons: 28px × 28px, 1.2px stroke weight, 60% opacity at rest
- Hover: 100% opacity + faint brand glow
- Active tool: brand background at 15% opacity

### US-6: Minimap
**As a** user navigating large graphs  
**I want** a minimap showing my viewport position  
**So that** I can orient myself and jump to different areas

**Acceptance Criteria**:
- 180px × 120px panel, bottom-left corner
- Background: rgba(8,12,16,0.9), 8px backdrop blur
- Simplified graph: 4px × 3px node rectangles, 0.5px edges
- Viewport rectangle: brand-color border, draggable
- State-based colors maintained at simplified fidelity

### US-7: Right Panel — Node Detail
**As a** user inspecting a selected node  
**I want** complete transparency into why it was chosen and what it's doing  
**So that** I can understand and control the orchestration

**Acceptance Criteria**:
- Width: 288px, background #111820, scrollable
- Empty state: centered illustration + "Select a node to inspect it"
- Header: 24px icon, node name (Syne 18px 700), type label, status pill
- Decision Transparency section: "WHY THIS WAS CHOSEN" reasoning block
- Alternatives Considered: collapsible, shows 2-3 non-selected options
- Current State mini-timeline: 3-5 stage markers with progress
- Controls: 2×2 button grid (Approve, Reject, Reroute, Pause)
- Configuration: form fields with custom styling
- Apply Changes button: full-width, loading → checkmark transition

### US-8: Micro-Interactions
**As a** user interacting with any element  
**I want** every action to feel responsive and intentional  
**So that** the interface feels alive and premium

**Acceptance Criteria**:
- Button press: scale to 0.97 (80ms) → 1.0 (150ms)
- Input focus: border → brand color, outer glow (200ms)
- Accordion expand: height animation 250ms cubic-bezier(0.22,1,0.36,1)
- Card hover: translateY(-4px), shadow deepens (200ms)
- Tab switch: indicator slides, content cross-fades (200ms)
- Toast: slides in from bottom-right (300ms), auto-dismiss 4s
- Node state change: all properties transition 400ms ease-in-out
- Panel content swap: outgoing slides left, incoming from right (overlapping)

### US-9: Performance & Optimization
**As a** user working with large graphs  
**I want** smooth 60fps performance even with hundreds of nodes  
**So that** the experience never feels sluggish

**Acceptance Criteria**:
- WebGL rendering for graphs with 100+ nodes
- SVG rendering for smaller graphs
- Node label fade-out below 50% zoom
- Simplified dot rendering below 50% zoom
- Additional metadata visible above 150% zoom
- Virtualization for off-screen nodes
- RequestAnimationFrame for all animations
- GPU acceleration (transform/opacity only)

### US-10: Responsive Behavior
**As a** user on tablet  
**I want** the canvas to adapt intelligently  
**So that** I can still use Flowfex effectively

**Acceptance Criteria**:
- Tablet (768px-1024px): left panel collapses to icons
- Right panel becomes bottom sheet (60% viewport height)
- Canvas fills full width
- Touch targets minimum 44px × 44px
- Pinch-to-zoom gesture support
- Touch-drag for pan

---

## Technical Requirements

### Canvas Rendering Stack
1. **Layer 1**: Base fill (#080C10) — CSS background
2. **Layer 2**: Dot grid texture — CSS radial-gradient pattern or canvas
3. **Layer 3**: Ambient gradient — CSS radial-gradient, conditional on agent state
4. **Layer 4**: Graph layer — SVG or WebGL canvas (pannable/zoomable)
5. **Layer 5**: UI overlays — React components (fixed viewport position)

### State Management
- Canvas viewport state (pan offset, zoom level)
- Node selection state (single/multi)
- Graph data (nodes, edges, states)
- Right panel content state
- Minimap visibility state
- Active tool state

### Animation Library
- Framer Motion for React component animations
- GSAP for complex path animations and timelines
- CSS transitions for simple state changes
- RequestAnimationFrame for canvas rendering loop

### Performance Targets
- 60fps during pan/zoom
- <16ms frame time for animations
- <100ms interaction response time
- <3s initial graph render for 100 nodes
- <50MB memory footprint for typical session

---

## Design Tokens

```css
/* Canvas Colors */
--canvas-void-deepest: #080C10;
--canvas-void-base: #0D1117;
--canvas-dot-grid: rgba(232, 237, 242, 0.04);
--canvas-ambient-glow: rgba(0, 229, 195, 0.015);

/* Node Colors */
--node-bg-rest: #111820;
--node-bg-active: #0D1820;
--node-bg-selected: #131D28;
--node-border-idle: rgba(232, 237, 242, 0.10);
--node-border-queued: rgba(0, 229, 195, 0.25);
--node-border-executing: rgba(0, 229, 195, 1.0);
--node-border-approval: rgba(0, 229, 195, 0.8);
--node-border-completed: rgba(0, 229, 195, 0.18);

/* Edge Colors */
--edge-inactive: rgba(232, 237, 242, 0.12);
--edge-active: rgba(0, 229, 195, 0.8);
--edge-completed: rgba(0, 229, 195, 0.22);

/* Shadows */
--shadow-node-executing: 0 0 0 1px rgba(0,229,195,0.3), 0 0 20px rgba(0,229,195,0.15);
--shadow-node-selected: 0 0 0 3px rgba(0,229,195,0.15), 0 0 30px rgba(0,229,195,0.2);

/* Animation Durations */
--duration-node-arc: 2500ms;
--duration-breathing: 1800ms;
--duration-pulse-travel: 1200ms;
--duration-state-transition: 400ms;

/* Easing Functions */
--ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
--ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);
```

---

## Success Criteria

✅ Canvas renders at 60fps with 100+ nodes  
✅ All 7 node states visually distinct and animated  
✅ Pulse dots travel along edges organically  
✅ Pan feels momentum-based and natural  
✅ Zoom is smooth and cursor-centered  
✅ Right panel updates instantly on node selection  
✅ Decision transparency is always visible  
✅ Every micro-interaction feels intentional  
✅ Active Theory / Igloo quality level achieved  
✅ User feels like they're "watching something think"

---

## References

- **Part 1**: Landing Page (completed)
- **Part 2**: Authentication & Onboarding (completed)
- **Part 3**: Dashboard Canvas (this document)

**Quality Bar**: Active Theory, Igloo, Stripe, Linear

**Brand Philosophy**: "A single thread of luminous intelligence running through a world of deep darkness."
