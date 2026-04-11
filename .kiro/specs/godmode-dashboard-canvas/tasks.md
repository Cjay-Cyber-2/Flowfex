# GODMODE FLOWFEX — Dashboard Canvas Implementation Tasks
## Production-Grade Execution Plan

---

## Task 1: Canvas Foundation & Layer System

### 1.1 Create Canvas Container Component
- [ ] Create `frontend/src/components/canvas/CanvasContainer.jsx`
- [ ] Implement 5-layer rendering system
- [ ] Set up viewport state management (pan offset, zoom level)
- [ ] Add resize observer for responsive canvas sizing
- [ ] Implement base fill (#080C10)

### 1.2 Implement Dot Grid Texture
- [ ] Create CSS radial-gradient pattern (1px dots, 24px spacing)
- [ ] Set opacity to rgba(232,237,242,0.04)
- [ ] Ensure grid remains fixed (doesn't zoom with graph)
- [ ] Test grid visibility at different zoom levels

### 1.3 Implement Ambient Depth Gradient
- [ ] Create radial gradient component
- [ ] Set center glow: rgba(0,229,195,0.015)
- [ ] Make conditional on agent active state
- [ ] Animate gradient appearance (fade in 800ms)

### 1.4 Set Up Graph Rendering Layer
- [ ] Choose rendering strategy (SVG for <100 nodes, WebGL for 100+)
- [ ] Implement pan/zoom transform container
- [ ] Set up coordinate system and viewport calculations
- [ ] Add GPU acceleration hints (translateZ(0))

### 1.5 Create UI Overlay Layer
- [ ] Set up fixed positioning for UI elements
- [ ] Ensure overlays don't interfere with graph interactions
- [ ] Add z-index management system

---

## Task 2: Pan & Zoom Interactions

### 2.1 Implement Pan Functionality
- [ ] Add mousedown/mousemove/mouseup event handlers
- [ ] Implement grab/grabbing cursor states
- [ ] Calculate pan delta and update viewport offset
- [ ] Add momentum-based inertia (gentle deceleration)
- [ ] Implement Space+drag alternative pan method

### 2.2 Implement Zoom Functionality
- [ ] Add wheel event handler for scroll zoom
- [ ] Implement cursor-centered zoom calculation
- [ ] Set zoom range constraints (30% - 200%)
- [ ] Add 150ms ease-out transition
- [ ] Implement pinch gesture for trackpad
- [ ] Add Cmd+scroll keyboard shortcut

### 2.3 Implement Zoom-Based Visibility
- [ ] Fade out node labels below 50% zoom
- [ ] Render simplified dots below 50% zoom
- [ ] Show additional metadata above 150% zoom
- [ ] Smooth transitions between visibility states

### 2.4 Add Fit-to-View Function
- [ ] Calculate bounding box of all nodes
- [ ] Compute optimal zoom and pan to fit graph
- [ ] Animate to fit position (600ms ease-out)
- [ ] Add Cmd+Shift+F keyboard shortcut

---

## Task 3: Node Component Architecture

### 3.1 Create Base Node Component
- [ ] Create `frontend/src/components/canvas/Node.jsx`
- [ ] Implement base structure (160px × 72px, border-radius 10px)
- [ ] Add internal layout (icon, primary label, secondary label)
- [ ] Implement type badge (6px × 6px, visible at 70%+ zoom)
- [ ] Add props interface (id, type, state, position, data)

### 3.2 Implement Node State Rendering
- [ ] Create state style map (idle, queued, executing, approval, completed, rejected, selected)
- [ ] Implement border color transitions
- [ ] Implement background color transitions
- [ ] Implement glow shadow transitions
- [ ] Add icon opacity transitions
- [ ] Add label color transitions

### 3.3 Create Executing State Animation
- [ ] Implement rotating arc indicator
- [ ] Use conic gradient or SVG arc
- [ ] Set 2.5s rotation duration with ease-in-out
- [ ] Arc covers 25% of perimeter
- [ ] Add fade on trailing edge

### 3.4 Create Awaiting Approval Animation
- [ ] Implement breathing border animation
- [ ] Oscillate opacity between 0.4 and 1.0
- [ ] Set 1.8s duration with ease-in-out
- [ ] Add approval badge (16px circle, hand/lock icon)
- [ ] Position badge at top-right corner

### 3.5 Implement Node Hover State
- [ ] Add hover event handlers
- [ ] Transition border to rgba(0,229,195,0.4) in 150ms
- [ ] Shift background to #121A22
- [ ] Show tooltip after 600ms delay
- [ ] Tooltip: dark glass pill, node type + description
- [ ] Fade in tooltip over 200ms

### 3.6 Implement Node Selection
- [ ] Add click event handler
- [ ] Apply selected state styling (2px brand border, elevated shadow)
- [ ] Trigger right panel update
- [ ] Add Escape key to deselect
- [ ] Add click-empty-canvas to deselect

### 3.7 Create Diamond Decision Node
- [ ] Create `frontend/src/components/canvas/DiamondNode.jsx`
- [ ] Implement 80px × 80px rotated square
- [ ] Center icon inside diamond
- [ ] Position label below diamond (centered)
- [ ] Apply same state system as base node

---

## Task 4: Edge Component Architecture

### 4.1 Create Base Edge Component
- [ ] Create `frontend/src/components/canvas/Edge.jsx`
- [ ] Implement SVG cubic bezier curve calculation
- [ ] Calculate source and target handles
- [ ] Compute control points for elegant curves
- [ ] Set base thickness: 1.5px

### 4.2 Implement Edge Arrowheads
- [ ] Create SVG marker definitions
- [ ] Arrowhead: 8px × 6px filled triangle
- [ ] Align arrowhead to edge direction
- [ ] Color arrowhead to match edge state

### 4.3 Implement Edge State Rendering
- [ ] Create state style map (inactive, active, completed, rerouted)
- [ ] Inactive: rgba(232,237,242,0.12)
- [ ] Active: rgba(0,229,195,0.8) with glow
- [ ] Completed: rgba(0,229,195,0.22)
- [ ] Rerouted: dashed line (stroke-dasharray: 6 4)

### 4.4 Create Traveling Pulse Dot Animation
- [ ] Create pulse dot element (4px diameter)
- [ ] Implement SVG animateMotion or GSAP MotionPathPlugin
- [ ] Set 1.2s travel duration with ease-in-out
- [ ] Loop infinitely
- [ ] Add radial glow to pulse dot
- [ ] Ensure multiple pulses are independently timed

### 4.5 Implement Edge Hover State
- [ ] Add hover event handlers
- [ ] Increase thickness to 2.5px on hover
- [ ] Show tooltip pill near cursor
- [ ] Tooltip content: source → target names, edge state
- [ ] Fade in tooltip over 150ms

### 4.6 Implement Edge Click Interaction
- [ ] Add click event handler
- [ ] Open edge control popover
- [ ] Popover options: "Reroute this path", "Block this connection"
- [ ] Style as glass pill with text buttons

### 4.7 Create Branch Edge Labels
- [ ] Position labels 20px from diamond node
- [ ] Style as dark pill (Inter 10px 500)
- [ ] Content: "True", "False", or custom condition
- [ ] Highlight active branch, dim inactive branch

---

## Task 5: Selection & Multi-Select

### 5.1 Implement Single Selection
- [ ] Track selected node ID in state
- [ ] Apply selected styling to node
- [ ] Update right panel content
- [ ] Add selection change animation

### 5.2 Implement Multi-Select
- [ ] Add Shift+click handler for additive selection
- [ ] Track array of selected node IDs
- [ ] Apply selected styling to all selected nodes

### 5.3 Implement Selection Rectangle
- [ ] Add mousedown on empty canvas handler
- [ ] Track drag start and current position
- [ ] Render selection rectangle (brand border 30% opacity, fill 5% opacity)
- [ ] Calculate nodes within rectangle on mouseup
- [ ] Select all nodes within rectangle

---

## Task 6: Canvas Bottom Toolbar

### 6.1 Create Toolbar Component
- [ ] Create `frontend/src/components/canvas/CanvasToolbar.jsx`
- [ ] Position: fixed, centered, 20px from bottom
- [ ] Dimensions: 280px × 40px
- [ ] Background: rgba(13,17,23,0.92), 16px backdrop blur
- [ ] Border: 1px solid rgba(232,237,242,0.1), border-radius 20px

### 6.2 Create Toolbar Buttons
- [ ] Create 7 icon buttons (28px × 28px each)
- [ ] Icons: Selection, Pan, Add Node, Add Annotation, Fit to View, Minimap, Fullscreen
- [ ] Icon stroke: 1.2px weight, 60% opacity at rest
- [ ] Hover: 100% opacity + faint brand glow
- [ ] Active tool: brand background 15% opacity + brand border

### 6.3 Implement Tool Switching
- [ ] Track active tool in state
- [ ] Switch between Selection and Pan tools
- [ ] Update cursor based on active tool
- [ ] Apply active styling to current tool button

### 6.4 Implement Toolbar Actions
- [ ] Add Node: open node creation modal
- [ ] Add Annotation: create text annotation on canvas
- [ ] Fit to View: trigger fit-to-view function
- [ ] Minimap: toggle minimap visibility
- [ ] Fullscreen: toggle fullscreen mode

---

## Task 7: Minimap Component

### 7.1 Create Minimap Component
- [ ] Create `frontend/src/components/canvas/Minimap.jsx`
- [ ] Position: fixed, bottom-left, 20px offset
- [ ] Dimensions: 180px × 120px
- [ ] Background: rgba(8,12,16,0.9), 8px backdrop blur
- [ ] Border: 1px solid rgba(232,237,242,0.1), border-radius 10px

### 7.2 Render Simplified Graph
- [ ] Render nodes as 4px × 3px rectangles
- [ ] Render edges as 0.5px hairlines
- [ ] Maintain state-based colors
- [ ] Scale entire graph to fit minimap

### 7.3 Implement Viewport Indicator
- [ ] Calculate viewport rectangle position
- [ ] Render semi-transparent brand-bordered rectangle
- [ ] Make viewport rectangle draggable
- [ ] Update main canvas pan on viewport drag

### 7.4 Add Minimap Toggle
- [ ] Implement show/hide animation (slide in/out)
- [ ] Connect to toolbar minimap button
- [ ] Save minimap visibility preference

---

## Task 8: Right Panel — Node Detail

### 8.1 Create Right Panel Component
- [ ] Create `frontend/src/components/canvas/RightPanel.jsx`
- [ ] Width: 288px, background #111820
- [ ] Left border: 1px separator at 6% opacity
- [ ] Implement custom scrollbar (3px wide, brand color 20% opacity)

### 8.2 Implement Empty State
- [ ] Create centered illustration (circular outline + cursor icon)
- [ ] Add text: "Select a node to inspect it"
- [ ] Style with Inter 13px muted

### 8.3 Create Header Block
- [ ] 24px node icon in brand color
- [ ] Node name: Syne 18px 700, full white
- [ ] Node type: Inter 12px all-caps muted
- [ ] Status pill: rounded, brand background 20% opacity

### 8.4 Create Decision Transparency Section
- [ ] Section label: "WHY THIS WAS CHOSEN" (Inter 11px all-caps)
- [ ] Reasoning text block: Inter 14px, line-height 1.7
- [ ] Add 2px brand-color left border
- [ ] Create "Alternatives Considered" collapsible
- [ ] Show 2-3 alternative tool rows (dimmed, non-interactive)

### 8.5 Create Current State Mini-Timeline
- [ ] Render 3-5 stage markers connected by line
- [ ] Completed stages: filled brand color 60% opacity
- [ ] Current stage: pulsing brand color
- [ ] Future stages: empty circles 20% opacity
- [ ] Stage labels: Inter 10px all-caps muted

### 8.6 Create Control Block
- [ ] Section label: "CONTROLS" (Inter 11px all-caps)
- [ ] Create 2×2 button grid (8px gaps)
- [ ] Approve button: brand background, deep void text, Syne 14px 600
- [ ] Reject button: amber background 15%, amber border, amber text
- [ ] Reroute button: ghost, brand border 35%, brand text 80%
- [ ] Pause button: ghost, same as Reroute
- [ ] Add hover effects (brighten, glow)
- [ ] Add press animation (scale to 0.97)
- [ ] Disable buttons when node not actionable (30% opacity)

### 8.7 Create Configuration Section
- [ ] Section label: "CONFIGURATION" (Inter 11px all-caps)
- [ ] Style form fields: 40px height, dark background, brand border on focus
- [ ] Custom checkboxes: dark square, brand checkmark, 150ms animation
- [ ] Toggle switches: 36px × 20px pill, brand color when on, 200ms slide
- [ ] Dropdown selects: glass panel, brand border on open, highlighted active option

### 8.8 Create Apply Changes Button
- [ ] Full-width button: 48px height, brand fill
- [ ] Label: Syne 15px 600 "Apply Changes"
- [ ] Hover: brightness +8%, outer glow
- [ ] Click: show loading spinner (400ms) → checkmark (1.2s) → label
- [ ] Add subtle ripple effect on panel content during apply

### 8.9 Implement Panel Content Transitions
- [ ] Outgoing content: slide 8px left + fade out (200ms)
- [ ] Incoming content: slide from 8px right + fade in (250ms, 100ms delay)
- [ ] Overlap animations for smooth handoff

---

## Task 9: Keyboard Shortcuts

### 9.1 Implement Canvas Shortcuts
- [ ] Space + drag: pan canvas
- [ ] Cmd/Ctrl + scroll: zoom
- [ ] Cmd/Ctrl + Shift + F: fit graph to view
- [ ] Cmd/Ctrl + Z: undo last manual change
- [ ] Delete/Backspace: remove selected node (with confirmation)
- [ ] Escape: deselect all

### 9.2 Implement Mode Switching Shortcuts
- [ ] M key: switch to Map mode
- [ ] F key: switch to Flow mode
- [ ] L key: switch to Live mode
- [ ] Add visual feedback on mode switch

---

## Task 10: Micro-Interactions Library

### 10.1 Button Interactions
- [ ] Press: scale to 0.97 (80ms) → 1.0 (150ms)
- [ ] Hover (filled): brightness +8%, outer glow (150ms)
- [ ] Hover (ghost): border 35%→100%, text 70%→100% (150ms)

### 10.2 Input Interactions
- [ ] Focus: border → brand color, outer glow (200ms)
- [ ] Blur: reverse transition (200ms)

### 10.3 Accordion Interactions
- [ ] Expand: height 0 → auto (250ms cubic-bezier(0.22,1,0.36,1))
- [ ] Chevron: rotate 180° simultaneously
- [ ] Collapse: reverse animation

### 10.4 Card Interactions
- [ ] Hover: translateY(-4px), shadow deepens (200ms)
- [ ] Return: translateY(0), shadow lightens (150ms)

### 10.5 Tab Interactions
- [ ] Active indicator: slide horizontally (200ms ease-out)
- [ ] Content: cross-fade simultaneously

### 10.6 Toast Notifications
- [ ] Enter: translateY(20px→0), opacity 0→1 (300ms)
- [ ] Exit: reverse animation after 4s auto-dismiss

### 10.7 Tooltip Interactions
- [ ] Appear: scale 0.95→1.0, opacity 0→1 (150ms, 600ms delay)
- [ ] Disappear: immediate on cursor leave

### 10.8 Modal Interactions
- [ ] Open: scale 0.92→1.0, opacity 0→1 (350ms cubic-bezier(0.16,1,0.3,1))
- [ ] Overlay: fade in (200ms)
- [ ] Close: reverse animation

### 10.9 Copy Confirmation
- [ ] Label cross-fade to checkmark + "Copied" (200ms)
- [ ] Brand color highlight
- [ ] Revert after 1.5s

---

## Task 11: Performance Optimization

### 11.1 Implement Rendering Strategy
- [ ] Use SVG for graphs with <100 nodes
- [ ] Use WebGL for graphs with 100+ nodes
- [ ] Implement renderer switching logic

### 11.2 Implement Virtualization
- [ ] Calculate visible viewport bounds
- [ ] Only render nodes within viewport + buffer
- [ ] Update visible nodes on pan/zoom
- [ ] Test with 500+ node graphs

### 11.3 Optimize Animations
- [ ] Use transform and opacity only (GPU accelerated)
- [ ] Add will-change hints to animating elements
- [ ] Use requestAnimationFrame for canvas rendering loop
- [ ] Throttle pan/zoom updates to 60fps

### 11.4 Implement Lazy Loading
- [ ] Defer loading of off-screen node details
- [ ] Load node metadata on demand
- [ ] Cache loaded data

### 11.5 Add Performance Monitoring
- [ ] Track frame rate during interactions
- [ ] Monitor memory usage
- [ ] Log performance metrics
- [ ] Add performance budget alerts

---

## Task 12: Responsive & Mobile Adaptations

### 12.1 Tablet Breakpoint (768px-1024px)
- [ ] Collapse left panel to icon-only by default
- [ ] Convert right panel to bottom sheet (60% viewport height)
- [ ] Add drag handle to bottom sheet
- [ ] Make bottom sheet dismissible
- [ ] Expand canvas to full width

### 12.2 Touch Interactions
- [ ] Implement pinch-to-zoom gesture
- [ ] Implement two-finger pan
- [ ] Ensure all touch targets are 44px × 44px minimum
- [ ] Add touch feedback (brief highlight on tap)

### 12.3 Mobile Optimizations
- [ ] Simplify node rendering on mobile
- [ ] Reduce animation complexity
- [ ] Optimize for lower-powered devices
- [ ] Test on actual mobile devices

---

## Task 13: State Management

### 13.1 Create Canvas Store
- [ ] Set up Zustand store for canvas state
- [ ] State: viewport (pan, zoom), selection, graph data, active tool
- [ ] Actions: updateViewport, selectNode, updateGraph, setTool

### 13.2 Create Node Store
- [ ] Store node data, positions, states
- [ ] Actions: updateNodeState, updateNodePosition, addNode, removeNode

### 13.3 Create Edge Store
- [ ] Store edge data, states
- [ ] Actions: updateEdgeState, addEdge, removeEdge, reroute Edge

### 13.4 Implement Undo/Redo
- [ ] Track history of manual changes
- [ ] Implement undo action (Cmd+Z)
- [ ] Implement redo action (Cmd+Shift+Z)
- [ ] Limit history to last 50 actions

---

## Task 14: Integration & Testing

### 14.1 Integrate with Existing Dashboard
- [ ] Import CanvasContainer into MainDashboard
- [ ] Connect to WebSocket for live updates
- [ ] Wire up mode switching
- [ ] Connect to session data

### 14.2 Create Demo Data
- [ ] Generate sample graph with 20-30 nodes
- [ ] Include all node types and states
- [ ] Add branching paths and decision nodes
- [ ] Create realistic edge connections

### 14.3 Visual Testing
- [ ] Test all node states render correctly
- [ ] Test all edge states render correctly
- [ ] Test animations are smooth (60fps)
- [ ] Test at different zoom levels
- [ ] Test pan momentum feels natural
- [ ] Test selection feedback is clear

### 14.4 Interaction Testing
- [ ] Test pan and zoom
- [ ] Test node selection (single and multi)
- [ ] Test edge hover and click
- [ ] Test toolbar buttons
- [ ] Test minimap drag
- [ ] Test right panel updates
- [ ] Test keyboard shortcuts

### 14.5 Performance Testing
- [ ] Test with 100 nodes
- [ ] Test with 500 nodes
- [ ] Test with 1000 nodes
- [ ] Measure frame rate during pan/zoom
- [ ] Measure memory usage
- [ ] Profile rendering performance

### 14.6 Responsive Testing
- [ ] Test at 1440px (canonical)
- [ ] Test at 1280px (laptop)
- [ ] Test at 1024px (tablet)
- [ ] Test at 768px (tablet portrait)
- [ ] Test touch interactions on tablet

---

## Task 15: Polish & Refinement

### 15.1 Animation Refinement
- [ ] Fine-tune easing curves
- [ ] Adjust animation durations
- [ ] Perfect stagger timings
- [ ] Ensure all animations encode meaning

### 15.2 Visual Refinement
- [ ] Adjust colors for perfect contrast
- [ ] Fine-tune glow intensities
- [ ] Perfect shadow depths
- [ ] Verify brand color consistency

### 15.3 Interaction Refinement
- [ ] Perfect hover feedback timing
- [ ] Smooth all state transitions
- [ ] Add haptic feedback (where supported)
- [ ] Perfect focus states

### 15.4 Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Add focus indicators
- [ ] Support reduced motion preference

### 15.5 Final Quality Pass
- [ ] Review against GODMODE spec
- [ ] Check all acceptance criteria
- [ ] Verify Active Theory / Igloo quality level
- [ ] Get stakeholder approval

---

## Estimated Timeline

- **Task 1**: Canvas Foundation (4 hours)
- **Task 2**: Pan & Zoom (4 hours)
- **Task 3**: Node Architecture (8 hours)
- **Task 4**: Edge Architecture (6 hours)
- **Task 5**: Selection (3 hours)
- **Task 6**: Bottom Toolbar (3 hours)
- **Task 7**: Minimap (4 hours)
- **Task 8**: Right Panel (8 hours)
- **Task 9**: Keyboard Shortcuts (2 hours)
- **Task 10**: Micro-Interactions (4 hours)
- **Task 11**: Performance (6 hours)
- **Task 12**: Responsive (4 hours)
- **Task 13**: State Management (4 hours)
- **Task 14**: Integration & Testing (8 hours)
- **Task 15**: Polish (6 hours)

**Total: 74 hours (~2 weeks for 1 developer)**

---

## Success Criteria

✅ Canvas renders at 60fps with 100+ nodes  
✅ All 7 node states visually distinct and animated  
✅ Pulse dots travel along edges organically  
✅ Pan feels momentum-based and natural  
✅ Zoom is smooth and cursor-centered  
✅ Right panel updates instantly on selection  
✅ Decision transparency always visible  
✅ Every micro-interaction feels intentional  
✅ Active Theory / Igloo quality level achieved  
✅ User feels like they're "watching something think"

---

**"The canvas is the soul of Flowfex. Make it breathe."**
