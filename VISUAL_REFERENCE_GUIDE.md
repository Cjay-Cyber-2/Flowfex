# FLOWFEX VISUAL REFERENCE GUIDE

## Animation Descriptions & Visual Specifications

This document provides detailed visual descriptions of each animation so developers and designers can accurately implement them.

---

## HERO SECTION ANIMATIONS

### 1. PARTICLE FIELD (3D Double Helix)

**Visual Description:**
```
Imagine looking at a DNA double helix made of glowing particles:

- 300 small orbs (2-4px diameter)
- Colors: 33% Sinoper red, 33% Massicot gold, 33% Verdigris teal
- Arranged in two intertwining spiral paths
- Vertical span: 10 units (top to bottom of viewport)
- Horizontal radius: 2 units from center axis
- Rotation: 0.1 degrees per second on Y-axis

Particle connections:
- Thin lines (1px, Sinoper at 15% opacity) connect particles within 80px
- Lines create a web-like structure
- Connections appear/disappear as particles rotate

Mouse interaction:
- Moving mouse left/right rotates helix on Z-axis (±5 degrees)
- Moving mouse up/down rotates helix on X-axis (±10 degrees)
- Smooth follow (200ms lag for organic feel)

Scroll interaction:
- As user scrolls down, particles scale up (1.0 → 3.0)
- Particles fade out (100% → 0% opacity)
- Effect: Particles "fly past" the user as they scroll
```

**Color Palette:**
- Sinoper: `rgb(158, 48, 40)` - Deep rust red
- Massicot: `rgb(196, 149, 48)` - Antique gold
- Verdigris Pale: `rgb(61, 122, 106)` - Aged teal

**Performance:**
- 60fps on mid-range hardware
- WebGL rendering (Three.js)
- Particle count reduces to 150 on mobile

---

### 2. SIGNAL WAVE (Circular Shockwave)

**Visual Description:**
```
A massive circular wave that emanates from the center of the viewport:

Initial state:
- Circle with 0px radius
- 2px stroke width
- Sinoper color at 60% opacity
- Positioned at viewport center (50%, 50%)

Animation sequence (3 seconds):
- Radius expands: 0px → 2000px
- Opacity fades: 60% → 0%
- Easing: power2.out (fast start, slow end)

Particle interaction:
- As wave passes through particles (within 20px), they pulse
- Pulse: scale 1.0 → 1.3 → 1.0 over 300ms
- Pulse: brightness +50% for 200ms

Timing:
- Wave triggers every 8 seconds
- First wave at page load + 2 seconds
- Creates a "heartbeat" rhythm
```

**Visual Metaphor:** Like dropping a stone in still water, but the ripple is made of light.

---

### 3. LIQUID METAL TEXT

**Visual Description:**
```
Text that transforms from molten metal into solid letters:

Initial state (per character):
- Heavy blur: 20px
- Opacity: 0%
- Scale: 1.2 (oversized)
- Glow: Sinoper at 80% opacity, 40px radius

Transformation (400ms per character):
- Blur reduces: 20px → 0px
- Opacity increases: 0% → 100%
- Scale normalizes: 1.2 → 1.0
- Glow shifts: Sinoper → Massicot, 40px → 20px radius

Stagger:
- Each character starts 28ms after previous
- Total reveal time: ~1.4 seconds for 50 characters

Final state:
- Crisp, readable text
- Metallic gradient background (Velin → Massicot → Velin)
- Gradient animates: position shifts 0% → 100% over 8 seconds
- Subtle glow: Massicot at 30% opacity, 20px radius

Hover interaction (per character):
- Character lifts: translateZ(10px)
- Scale increases: 1.0 → 1.05
- Glow intensifies: 30% → 50% opacity
- Duration: 200ms
- Easing: power2.out
```

**Visual Metaphor:** Like watching metal cool and solidify in a forge, but in reverse (liquid → solid).

---

### 4. PORTAL BUTTON

**Visual Description:**
```
A button with three animated layers:

Layer 1: Base (button surface)
- Background: Sinoper solid
- Size: 56px height, auto width
- Border radius: 8px
- Text: Velin color, Satoshi 500, 17px

Layer 2: Rotating Glow
- Radial gradient: Sinoper (center) → Massicot (50%) → Sinoper (edge)
- Size: button size + 8px padding (inset: -4px)
- Blur: 12px
- Opacity: 70%
- Rotation: 360 degrees over 8 seconds (continuous)
- Easing: linear (no easing for smooth rotation)

Layer 3: Orbital Particles
- 12 particles (3px diameter, Massicot color)
- Orbit radius: 60px from button center
- Orbit speed: 1 revolution per 8 seconds
- Particles fade in/out: opacity 20% → 100% → 20% (sine wave)
- Each particle offset by 30 degrees (360/12)

Idle animation:
- Glow pulses: box-shadow 24px → 32px → 24px over 2.4 seconds
- Creates a "breathing" effect

Hover state:
- Button scale: 1.0 → 1.05 (elastic easing)
- Glow scale: 1.0 → 1.2
- Glow opacity: 70% → 100%
- Particle speed: 3x faster (3 revolutions per 8 seconds)
- Duration: 300ms

Click state:
- Button implodes: scale 1.0 → 0.95 (100ms, power2.in)
- Button bounces back: scale 0.95 → 1.0 (200ms, elastic.out)
- Particle burst: 30 particles explode outward
  - Particles: 4px diameter, alternating Sinoper/Massicot
  - Travel distance: 100-200px (random)
  - Duration: 600-1000ms (random)
  - Fade out: opacity 100% → 0%
- Shockwave: circular ring expands from button
  - Ring: 3px stroke, Sinoper color
  - Radius: 0px → 500px over 800ms
  - Opacity: 100% → 0%
```

**Visual Metaphor:** Like pressing a button that opens a portal to another dimension.

---

## FEATURE SECTION ANIMATIONS

### 5. SELF-BUILDING GRAPH

**Visual Description:**
```
A graph that constructs itself as the user scrolls into view:

Trigger: Section enters viewport (10% visible)

Sequence:
1. Input node materializes (0-400ms)
   - Scale: 0 → 1.0 (elastic easing)
   - Opacity: 0 → 100%
   - Sinoper pulse: ring expands 0px → 40px, fades out

2. First edge draws (400-800ms)
   - SVG path stroke-dashoffset animation
   - Draws from input node downward
   - Speed: 240px per second
   - Color: Bistre at 40% → Sinoper at 70% (gradient)
   - Leaves Massicot glow trail (80% opacity, fades over 600ms)

3. First tool node appears (800-1000ms)
   - Same materialization as input node
   - Icon floats in: translateY(-10px → 0px)

4. Subsequent edges and nodes (1000-3000ms)
   - Each edge draws in sequence
   - Each node appears after its incoming edge completes
   - Timing: 200ms per edge, 200ms per node
   - Creates a "cascade" effect

5. Execution particles activate (3000ms+)
   - Small dots (4×1.5px, Massicot color) flow along edges
   - 3-6 particles per edge
   - Speed: 180px per second
   - Particles fade in at source, fade out at destination
   - Continuous loop

Final state:
- Complete graph with 5-7 nodes
- All edges have flowing particles
- Nodes have subtle breathing animation (glow 6px → 14px → 6px over 2.4s)
```

**Visual Metaphor:** Like watching a thought form in real-time, connections drawing themselves as the AI "thinks."

---

### 6. CONNECTION CEREMONY

**Visual Description:**
```
A ritual where agents connect to a central hub:

Initial state:
- Central hub: Large Flowfex logo node (60px diameter)
- Agent nodes: 6 nodes in a circle around hub (radius: 200px)
- Agent nodes are dim (30% opacity) and disconnected

Trigger: Section enters viewport

Sequence (per agent, staggered by 400ms):
1. Agent node brightens (0-200ms)
   - Opacity: 30% → 100%
   - Scale: 0.8 → 1.0

2. Connection beam shoots (200-600ms)
   - Beam: 2px wide line, Sinoper color
   - Starts at agent node, travels to hub
   - Speed: 400px per second
   - Leaves light trail (Massicot glow, fades over 400ms)

3. Connection established (600-800ms)
   - Both nodes pulse simultaneously
   - Pulse: scale 1.0 → 1.2 → 1.0, Sinoper glow
   - Edge solidifies: Bistre at 40% opacity, 1.5px width

4. Next agent begins (800ms)
   - Repeat for next agent in circle

Final state (after all 6 agents):
- All agents connected to hub
- Entire structure rotates slowly (360 degrees over 20 seconds)
- Rotation axis: Y-axis (3D effect)
- Nodes closer to viewer are larger (perspective)
```

**Visual Metaphor:** Like a solar system forming, with agents as planets orbiting the Flowfex sun.

---

### 7. APPROVAL FLOW DEMO

**Visual Description:**
```
A live demonstration of the approval system:

Layout:
- Left side: Graph with execution path (400×300px)
- Right side: Control panel with approval card (360×400px)

Sequence:
1. Execution progresses (0-2000ms)
   - Particles flow through graph
   - Nodes light up sequentially
   - Progress reaches a decision node

2. Approval request (2000-2200ms)
   - Decision node emits Indian Yellow pulse rings
   - Rings: 3 concentric circles expanding from node
   - Each ring: radius 0px → 60px over 1.2 seconds
   - Rings repeat every 3 seconds until resolved

3. Approval card appears (2200-2500ms)
   - Card slides in from right: translateX(400px → 0px)
   - Card has Indian Yellow left border (4px)
   - Card content fades in (staggered by 50ms per element)

4. User interaction (2500ms+)
   - User can click "Approve" or "Reject"
   - Buttons have hover states (scale 1.0 → 1.02)

5a. If Approved (click + 0-800ms)
   - Green checkmark animates in (SVG path draw)
   - Decision node turns Verdigris Pale
   - Pulse rings stop
   - Execution continues (particles resume flow)
   - Card slides out to right

5b. If Rejected (click + 0-1200ms)
   - Red X animates in (two lines slash across)
   - Decision node flashes Sinoper Bright
   - Node connections warp outward (displacement effect, 180ms)
   - New edge draws from upstream node to alternative path
   - Card slides out to right
```

**Visual Metaphor:** Like a traffic light system, but for AI decisions.

---

### 8. MODE TRANSITION CANVAS

**Visual Description:**
```
A single graph that morphs between three viewing modes:

Initial state: Map Mode
- All nodes visible in force-directed layout
- Nodes drift gently (±6px amplitude, 8-14s cycle)
- Edges are thin (1.5px) and muted (Bistre at 30%)
- No particles, no glows
- Feels calm and exploratory

Transition to Flow Mode (800ms):
1. Layout reorganizes (0-800ms)
   - Nodes tween to hierarchical positions (top-to-bottom)
   - Uses FLIP technique (First, Last, Invert, Play)
   - Easing: cubic-bezier(0.16, 1, 0.3, 1)

2. Visual effects change (400-800ms)
   - Active path edges brighten (30% → 70% opacity)
   - Inactive nodes fade (100% → 20% opacity)
   - Active nodes get Sinoper glow (0px → 8px)

Flow Mode steady state:
- Clear hierarchy visible
- Active path highlighted
- Inactive elements recede
- Feels focused and directional

Transition to Live Mode (800ms):
1. Visual intensity increases (0-800ms)
   - Particle streams activate on all active edges
   - Orbital rings appear on active nodes
   - Background glow layer intensifies (Caput Mortuum at 0% → 20%)
   - Node glows brighten (8px → 14px)

Live Mode steady state:
- Maximum visual information
- Continuous motion (particles, rings, pulses)
- Real-time metrics appear next to nodes
- Feels alive and dynamic

Mode indicator:
- Three buttons: "MAP", "FLOW", "LIVE"
- Active mode: Sinoper text + 1px bottom line
- Transition: line slides from old to new (200ms)
```

**Visual Metaphor:** Like adjusting the zoom and focus on a microscope, revealing different levels of detail.

---

## CANVAS ENHANCEMENTS

### 9. INFINITE GRID

**Visual Description:**
```
A multi-layered grid that creates depth and responds to activity:

Layer 1: Base Grid
- Dots: 1px diameter, Wenge Ash at 8% opacity
- Spacing: 40px × 40px
- Covers entire canvas
- Static (no animation)

Layer 2: Major Grid
- Dots: 2px diameter, Wenge Ash at 15% opacity
- Spacing: 200px × 200px
- Aligned with base grid
- Static

Layer 3: Depth Grid
- Dots: 4px diameter, Caput Mortuum at 5% opacity
- Spacing: 400px × 400px
- Blur: 2px
- Parallax: moves at 0.5x scroll speed (creates depth illusion)

Reactive behavior:
- When execution particle passes within 30px of a grid dot:
  - Dot pulses: scale 1.0 → 2.0 → 1.0 over 300ms
  - Dot brightens: opacity +50% for 200ms
  - Creates a "ripple" effect through the grid

Gravity field warping:
- Around active nodes, grid dots are pulled toward node center
- Displacement amount: inversely proportional to distance
- Formula: displacement = (nodeRadius / distance) * 10px
- Maximum displacement: 10px
- Creates a "gravity well" visual
```

**Visual Metaphor:** Like a fabric of spacetime that warps around massive objects.

---

### 10. LIVING NODES

**Visual Description:**
```
Nodes that feel alive through subtle continuous motion:

Idle State:
- Node body: Wenge Ash background, 1px Bistre border
- Size: 80px × 60px (rounded rectangle, 14px radius)
- Inner glow: Radial gradient from center (Wenge Ash → transparent)
- Border shimmer: Animated gradient travels around perimeter
  - Gradient: transparent → Bistre → transparent
  - Speed: 360 degrees over 4 seconds
- Icon float: translateY(-2px → 2px → -2px over 3 seconds)

Active State (node is processing):
- Border: Sinoper at 80% opacity
- Breathing glow: Sinoper halo expands 6px → 14px → 6px over 2.4s
- Orbital rings: Two thin arcs (2px stroke, Sinoper at 30%)
  - Ring 1: 150% of node radius, rotates clockwise, 4s per revolution
  - Ring 2: 180% of node radius, rotates counterclockwise, 6s per revolution
- Particle trails: Rings leave faint light trails (motion blur)
- Internal metrics: Small bar chart animates inside node (data visualization)

Hover State:
- Node lifts: translateZ(20px) with perspective
- Shadow grows: 8px → 20px blur, opacity 40% → 60%
- Spotlight: Radial gradient overlay (white at 5% opacity, 200px radius)
- Connected edges brighten: 40% → 70% opacity
- Metadata panel slides out from right side of node (300ms)

Selection State:
- Node expands: scale 1.0 → 1.1
- Selection ring: 4px Massicot ring, 4px gap from node border
- Ring has rotating gradient (like border shimmer but brighter)
- Radial menu appears: 6 action buttons in circle around node
  - Buttons: 32px diameter, Wenge Ash background
  - Buttons slide in from node center (staggered by 40ms)
- Background dims: Everything except selected node at 40% opacity
```

**Visual Metaphor:** Like living cells under a microscope, pulsing with activity.

---

### 11. NEURAL PATHWAY EDGES

**Visual Description:**
```
Edges that show data flowing like signals through neurons:

Standard Edge (inactive):
- Path: Bezier curve (curve tension: 0.4)
- Width: 1.5px
- Color: Bistre at 35% opacity
- Gradient: Source node color → Destination node color
- Pulse: Subtle brightness wave travels along edge every 2-3 seconds
  - Wave: 40px long, opacity +20%, travels at 120px/s

Active Edge (execution in progress):
- Width: 2px
- Color: Sinoper at 70% opacity
- Particle stream: 3-6 particles flowing continuously
  - Data particles: 4px dots, Massicot color
  - Signal particles: 8×2px dashes, Sinoper color
  - Error particles: 6px jagged shapes, Sinoper Bright color
- Particles have motion blur: 16px trail with exponential opacity falloff
- Particle speed: 180px/s (faster on high-confidence paths)

Completed Edge:
- Width: 1.5px
- Color: Verdigris Pale at 45% opacity
- No animation (static)
- Subtle glow: 2px Verdigris halo

Hover State:
- Edge brightens: opacity +30%
- Waveform appears along edge: Shows data volume over time
  - Waveform: Sine wave, amplitude varies with data volume
  - Color: Massicot at 60% opacity
- Tooltip appears at cursor position:
  - Shows: Data type, volume, timing
  - Glassmorphic background
  - Fades in over 200ms

Click State:
- Entire path highlights: All edges from source to destination
- Highlighted edges: Massicot color at 90% opacity
- Progress indicator: Shows execution progress along path
  - Indicator: Small dot (8px) that travels the path
  - Leaves light trail
```

**Visual Metaphor:** Like watching electrical signals travel through a circuit board.

---

## EXECUTION ANIMATIONS

### 12. THE BIG BANG (Task Initiation)

**Visual Description:**
```
A dramatic explosion that births the execution graph:

Sequence:
1. Compression (0-200ms)
   - Input node compresses: scale 1.0 → 0.8
   - Node brightens: Sinoper glow intensifies
   - Surrounding space warps inward (displacement effect)

2. Explosion (200-600ms)
   - Node explodes: 50-100 particles burst outward
   - Particles: 4-8px, Sinoper and Massicot colors
   - Velocity: 400-800px/s (random)
   - Particles travel 100-300px before transforming

3. Transformation (600-1400ms)
   - Particles slow down and coalesce
   - Each particle group forms a new node
   - Nodes materialize: particles → solid shape
   - Edges draw between nodes (ink-flow effect)

4. Shockwave (200-1000ms)
   - Circular distortion wave expands from input node
   - Wave: 800px radius, distorts everything it passes
   - Grid warps, particles scatter, edges ripple
   - Wave fades out over 800ms

5. Settle (1400-2000ms)
   - All nodes bounce into final positions (elastic easing)
   - Edges stabilize
   - Particle streams begin flowing
   - System transitions to active execution state
```

**Visual Metaphor:** Like the Big Bang creating a universe, but for an AI task.

---

### 13. THE CASCADE (Execution Waterfall)

**Visual Description:**
```
Execution flows through the graph like water cascading down tiers:

Precondition: Graph is arranged in hierarchical tiers (top to bottom)

Sequence (per tier):
1. Tier completion (0-200ms)
   - All nodes in current tier emit downward pulse
   - Pulse: Sinoper wave, 40px tall, travels down edges
   - Pulse speed: 240px/s

2. Pulse reaches next tier (200-400ms)
   - Nodes in next tier ignite sequentially (left to right)
   - Ignition: Node flashes Massicot, then settles to Sinoper glow
   - Stagger: 80ms between nodes

3. Progress wave (0-800ms)
   - Horizontal line sweeps down canvas
   - Line: 1px, Massicot color, 60% opacity
   - Line has glow: 20px blur, Massicot at 30%
   - Speed: 200px/s

4. Repeat for next tier
   - Cascade continues until all tiers complete

Visual effect:
- Creates a "waterfall" of light flowing downward
- Each tier lights up in sequence
- Feels like intelligence flowing through the system
```

**Visual Metaphor:** Like watching a waterfall of light cascade down a cliff face.

---

### 14. THE CONSTELLATION (Completion)

**Visual Description:**
```
The completed execution path forms a constellation:

Sequence:
1. Path replay (0-2000ms)
   - All executed nodes pulse in sequence (order of execution)
   - Pulse: Verdigris Pale glow, 200ms per node
   - Stagger: 80ms between nodes
   - Creates a "replay" of the execution path

2. Constellation formation (2000-3000ms)
   - Temporary light beams connect all executed nodes
   - Beams: 1px, Massicot color, 80% opacity
   - Beams draw simultaneously (not just along edges)
   - Creates a constellation pattern

3. Golden wash (3000-4800ms)
   - Radial wave of Massicot light expands from final node
   - Wave: 2000px radius, 8% opacity
   - Wave travels slowly: 180 seconds to fill canvas
   - Everything it touches briefly glows golden

4. Settle (4800-5000ms)
   - Constellation beams fade out
   - Nodes settle to completed state (Verdigris Pale)
   - Particle streams stop
   - Graph becomes static

Final state:
- Completed graph with all nodes in Verdigris Pale
- No ongoing animation
- Feels calm and resolved
```

**Visual Metaphor:** Like stars forming a constellation in the night sky, revealing a pattern.

---

## MICRO-INTERACTIONS

### 15. CURSOR TRAIL

**Visual Description:**
```
A subtle trail of particles that follows the cursor:

Particle generation:
- New particle created every 16ms (60fps)
- Particle: 3px diameter, Massicot color at 20% opacity
- Particle position: Cursor position + random offset (±2px)
- Particle has slight blur: 1px

Particle lifecycle:
- Fade in: 0% → 20% over 50ms
- Hold: 20% opacity for 100ms
- Fade out: 20% → 0% over 250ms
- Total lifetime: 400ms

Trail behavior:
- 5-8 particles visible at any time
- Particles don't move after creation (cursor moves away from them)
- Creates a "comet tail" effect
- Trail is more prominent when cursor moves quickly

Intensity variation:
- Slow cursor movement: 5 particles, 15% opacity
- Fast cursor movement: 8 particles, 25% opacity
- Stationary cursor: No particles (trail stops)
```

**Visual Metaphor:** Like a comet's tail, but made of light particles.

---

### 16. BUTTON RIPPLE

**Visual Description:**
```
A ripple effect that emanates from the click point:

Trigger: User clicks button

Sequence:
1. Ripple creation (0ms)
   - Circular element created at click coordinates
   - Initial: 0px radius, Sinoper at 30% opacity

2. Expansion (0-600ms)
   - Radius expands: 0px → button width (or 200px, whichever is larger)
   - Opacity fades: 30% → 0%
   - Easing: cubic-bezier(0.4, 0, 0.2, 1)

3. Cleanup (600ms)
   - Ripple element removed from DOM

Visual effect:
- Creates a "splash" effect from the click point
- Ripple is clipped to button boundaries (overflow: hidden)
- Multiple ripples can exist simultaneously (rapid clicks)
```

**Visual Metaphor:** Like dropping a stone in water, but the ripple is made of light.

---

## COLOR REFERENCE

### Primary Colors
- **Eigengrau**: `#16161D` - Deepest background
- **Wenge Ash**: `#1C1812` - Surface color
- **Caput Mortuum**: `#2C1620` - Secondary depth
- **Sinoper**: `#9E3028` - Primary accent (active, error)
- **Mummy Brown**: `#8B5B38` - Secondary accent
- **Massicot**: `#C49530` - Highlight (completion, gold)
- **Velin**: `#EDE8DF` - Primary text
- **Bistre**: `#7A6A5C` - Muted text

### State Colors
- **Verdigris Pale**: `#3D7A6A` - Success, completed
- **Indian Yellow**: `#C78B2A` - Warning, approval needed
- **Sinoper Bright**: `#C23028` - Error, rejected
- **Massicot Glow**: `#D4A840` - Execution particles

### Usage Guidelines
- Never use pure black (`#000000`) or pure white (`#FFFFFF`)
- All glows use accent colors at 10-30% opacity
- Gradients use warm transitions (no blue)
- State changes are communicated through color shifts

---

## TIMING REFERENCE

### Animation Durations
- **Micro (instant feedback)**: 100-200ms
- **Short (UI transitions)**: 200-400ms
- **Medium (content reveals)**: 400-800ms
- **Long (dramatic effects)**: 800-2000ms
- **Ambient (continuous)**: 2000ms+ (looping)

### Easing Functions
- **Expo out**: `cubic-bezier(0.16, 1, 0.3, 1)` - Entries, reveals
- **Expo in**: `cubic-bezier(0.7, 0, 0.84, 0)` - Exits, dismissals
- **Elastic out**: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` - Bouncy arrivals
- **Power2 out**: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` - Smooth deceleration
- **Linear**: `cubic-bezier(0, 0, 1, 1)` - Continuous rotation

---

## PERFORMANCE TARGETS

### Frame Rate
- **Target**: 60fps constant
- **Acceptable**: 55-60fps (occasional drops)
- **Unacceptable**: < 55fps

### Load Time
- **Target**: < 2 seconds
- **Acceptable**: < 3 seconds
- **Unacceptable**: > 3 seconds

### GPU Usage
- **Target**: < 50% on mid-range hardware
- **Acceptable**: < 70%
- **Unacceptable**: > 70%

---

*End of Visual Reference Guide*
