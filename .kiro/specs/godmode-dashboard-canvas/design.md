# GODMODE FLOWFEX — Dashboard Canvas Design
## Visual Architecture & Component Specification

---

## Design Philosophy

**"Watching something think."**

The canvas is the soul of Flowfex. Every pixel, every animation, every interaction must serve one purpose: making invisible AI orchestration visible, beautiful, and controllable.

---

## Visual Hierarchy

### Layer System (Z-Index Stack)
```
Layer 5: UI Overlays (z-index: 1000)
  ├─ Bottom Toolbar
  ├─ Minimap
  ├─ Tooltips
  └─ Context Menus

Layer 4: Graph Content (z-index: 100)
  ├─ Nodes
  ├─ Edges
  ├─ Pulse Animations
  └─ Selection Indicators

Layer 3: Ambient Gradient (z-index: 10)
  └─ Radial glow (conditional)

Layer 2: Dot Grid (z-index: 5)
  └─ Fixed texture pattern

Layer 1: Base Fill (z-index: 0)
  └─ #080C10 void
```

---

## Canvas Foundation Design

### Background Composition

**Layer 1: Base Fill**
```css
background: #080C10;
width: 100%;
height: 100%;
```

**Layer 2: Dot Grid Texture**
```css
background-image: radial-gradient(
  circle,
  rgba(232, 237, 242, 0.04) 1px,
  transparent 1px
);
background-size: 24px 24px;
background-position: 0 0;
/* Fixed — does not transform with graph */
```

**Layer 3: Ambient Depth Gradient**
```css
/* Only visible when agent is active */
background: radial-gradient(
  circle at center,
  rgba(0, 229, 195, 0.015) 0%,
  transparent 60%
);
/* Very large radius — creates subtle warmth at center */
```

### Visual Effect
- Infinite structured void
- Barely perceptible warmth when active
- Sense of depth and space
- Grid provides orientation without distraction

---

## Node Design System

### Base Node Anatomy

```
┌─────────────────────────────────┐
│ [Icon]              [TypeBadge] │ ← 16px padding
│                                 │
│ Primary Label                   │ ← Inter 14px 600
│ Secondary Label                 │ ← Inter 11px 400
│                                 │
└─────────────────────────────────┘
  160px min width × 72px height
  border-radius: 10px
```

### Node State Visual Specifications

#### 1. Idle State
```css
background: #111820;
border: 1px solid rgba(232, 237, 242, 0.10);
box-shadow: none;

.icon {
  opacity: 0.4;
  color: #4A5568;
}

.primary-label {
  color: #4A5568;
}
```
**Visual**: Dormant, waiting, barely visible

#### 2. Queued State
```css
background: #111820;
border: 1px solid rgba(0, 229, 195, 0.25);
box-shadow: none;

.icon {
  opacity: 0.6;
  color: #8A96A3;
}

.primary-label {
  color: #8A96A3;
}
```
**Visual**: Next in line, slightly more present

#### 3. Executing State
```css
background: #0D1820;
border: 1.5px solid rgba(0, 229, 195, 1.0);
box-shadow: 
  0 0 0 1px rgba(0, 229, 195, 0.3),
  0 0 20px rgba(0, 229, 195, 0.15);

.icon {
  opacity: 1.0;
  color: #00E5C3; /* Slight brand tint */
}

.primary-label {
  color: #E8EDF2;
}

/* Rotating arc animation */
@keyframes rotating-arc {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.arc-indicator {
  animation: rotating-arc 2.5s ease-in-out infinite;
  /* Conic gradient covering 25% of perimeter */
}
```
**Visual**: Alive, glowing, actively thinking

#### 4. Awaiting Approval State
```css
background: #0D1820;
border: 1.5px solid rgba(0, 229, 195, 0.8);
box-shadow: 
  0 0 0 1px rgba(0, 229, 195, 0.3),
  0 0 24px rgba(0, 229, 195, 0.18);

/* Breathing animation */
@keyframes breathing-border {
  0%, 100% { border-color: rgba(0, 229, 195, 0.4); }
  50% { border-color: rgba(0, 229, 195, 1.0); }
}

animation: breathing-border 1.8s ease-in-out infinite;

/* Approval badge */
.approval-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  background: #080C10;
  border: 1px solid rgba(0, 229, 195, 0.6);
  border-radius: 50%;
  /* Hand or lock icon inside */
}
```
**Visual**: Pulsing, urgent but not alarming, needs attention

#### 5. Completed State
```css
background: #111820;
border: 1px solid rgba(0, 229, 195, 0.18);
box-shadow: none;

.icon {
  opacity: 0.7;
  color: #8A96A3;
}

.primary-label {
  color: #8A96A3;
}

/* Checkmark badge */
.checkmark-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  color: rgba(0, 229, 195, 0.6);
}
```
**Visual**: Resolved, at rest, job done

#### 6. Rejected/Skipped State
```css
opacity: 0.35;
background: #111820;
border: 1px solid rgba(232, 237, 242, 0.08);

/* X mark badge */
.reject-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  color: rgba(138, 112, 64, 0.6);
}
```
**Visual**: Receded, not part of the path

#### 7. Selected State
```css
background: #131D28;
border: 2px solid rgba(0, 229, 195, 1.0);
box-shadow: 
  0 0 0 3px rgba(0, 229, 195, 0.15),
  0 0 30px rgba(0, 229, 195, 0.2);
transform: translateZ(0); /* GPU acceleration */
```
**Visual**: Elevated, focused, primary attention

### Diamond Decision Node

```
       ┌─────┐
      ╱       ╲
     ╱  [Icon] ╲
    ╱           ╲
   └─────────────┘
        Label
   (centered below)
```

```css
width: 80px;
height: 80px;
transform: rotate(45deg);
border-radius: 8px;

.content {
  transform: rotate(-45deg); /* Counter-rotate content */
}

.label {
  position: absolute;
  top: 100%;
  margin-top: 12px;
  text-align: center;
}
```

### Node Hover State
```css
/* Transition on hover */
border-color: rgba(0, 229, 195, 0.4);
background: #121A22;
transition: all 150ms ease-out;

/* Tooltip appears after 600ms */
.tooltip {
  animation: tooltip-appear 200ms ease-out;
  animation-delay: 600ms;
}
```

---

## Edge Design System

### Edge Anatomy

```
Source Node
    │
    │ ← Cubic bezier curve
    ↓    1.5px thickness
    │    Arrowhead at target
    │
Target Node
```

### Edge State Specifications

#### Inactive Edge
```css
stroke: rgba(232, 237, 242, 0.12);
stroke-width: 1.5px;
fill: none;

.arrowhead {
  fill: rgba(232, 237, 242, 0.12);
}
```

#### Active/Executing Edge
```css
stroke: rgba(0, 229, 195, 0.8);
stroke-width: 1.5px;
filter: drop-shadow(0 0 6px rgba(0, 229, 195, 0.3));

.arrowhead {
  fill: rgba(0, 229, 195, 1.0);
}

/* Traveling pulse dot */
.pulse-dot {
  r: 4px;
  fill: rgba(0, 229, 195, 1.0);
  filter: drop-shadow(0 0 4px rgba(0, 229, 195, 0.6));
  
  animation: travel-path 1.2s ease-in-out infinite;
}
```

#### Completed Edge
```css
stroke: rgba(0, 229, 195, 0.22);
stroke-width: 1.5px;
fill: none;

.arrowhead {
  fill: rgba(0, 229, 195, 0.22);
}
```

#### Hover Edge
```css
stroke-width: 2.5px;
transition: stroke-width 150ms ease-out;

/* Tooltip pill */
.edge-tooltip {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(0, 229, 195, 0.2);
  border-radius: 12px;
  padding: 6px 12px;
  backdrop-filter: blur(12px);
}
```

### Branch Edge Labels
```css
.branch-label {
  background: rgba(13, 17, 23, 0.9);
  border: 1px solid rgba(232, 237, 242, 0.1);
  border-radius: 8px;
  padding: 4px 8px;
  font: 500 10px/1.2 'Inter';
  color: #8A96A3;
}
```

---

## Canvas Bottom Toolbar

### Visual Design

```
┌──────────────────────────────────────────────┐
│  [◉] [✋] [+] [💬] [⊡] [▦] [⤢]              │
│   Selection  Pan  Add  Note  Fit  Map  Full  │
└──────────────────────────────────────────────┘
     280px × 40px, centered, 20px from bottom
```

```css
.canvas-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  
  width: 280px;
  height: 40px;
  
  background: rgba(13, 17, 23, 0.92);
  border: 1px solid rgba(232, 237, 242, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(16px);
  
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
}

.toolbar-button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  color: rgba(232, 237, 242, 0.6);
  transition: all 150ms ease-out;
}

.toolbar-button:hover {
  color: rgba(232, 237, 242, 1.0);
  box-shadow: 0 0 12px rgba(0, 229, 195, 0.15);
}

.toolbar-button.active {
  background: rgba(0, 229, 195, 0.15);
  border: 1px solid rgba(0, 229, 195, 0.3);
  color: rgba(0, 229, 195, 1.0);
}
```

---

## Minimap Design

```
┌─────────────────┐
│ ┌─────────────┐ │
│ │ Simplified  │ │
│ │   Graph     │ │
│ │             │ │
│ │  [Viewport] │ │
│ └─────────────┘ │
└─────────────────┘
  180px × 120px
```

```css
.minimap {
  position: fixed;
  bottom: 20px;
  left: 20px;
  
  width: 180px;
  height: 120px;
  
  background: rgba(8, 12, 16, 0.9);
  border: 1px solid rgba(232, 237, 242, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  
  overflow: hidden;
}

.minimap-node {
  width: 4px;
  height: 3px;
  border-radius: 1px;
  /* State-based colors */
}

.minimap-edge {
  stroke-width: 0.5px;
  /* State-based colors */
}

.minimap-viewport {
  border: 1.5px solid rgba(0, 229, 195, 0.6);
  background: rgba(0, 229, 195, 0.05);
  cursor: grab;
}
```

---

## Right Panel Design

### Panel Structure

```
┌─────────────────────────────────┐
│ [Icon] Node Name        [Status]│ ← Header
├─────────────────────────────────┤
│ WHY THIS WAS CHOSEN             │
│ ┃ Reasoning text block...       │ ← Decision Transparency
│ ┃ with brand-color left border  │
│                                 │
│ ▸ Alternatives Considered       │ ← Collapsible
├─────────────────────────────────┤
│ CURRENT STATE                   │
│ ●───●───○───○                   │ ← Mini-timeline
├─────────────────────────────────┤
│ CONTROLS                        │
│ ┌──────────┐ ┌──────────┐      │
│ │ Approve  │ │ Reject   │      │ ← 2×2 Grid
│ └──────────┘ └──────────┘      │
│ ┌──────────┐ ┌──────────┐      │
│ │ Reroute  │ │ Pause    │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ CONFIGURATION                   │
│ [Form fields...]                │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │     Apply Changes           │ │ ← Full-width CTA
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Component Styles

**Header Block**
```css
.panel-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.node-icon {
  width: 24px;
  height: 24px;
  color: #00E5C3;
}

.node-name {
  font: 700 18px/1.2 'Syne';
  color: #E8EDF2;
}

.node-type {
  font: 400 12px/1.2 'Inter';
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4A5568;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(0, 229, 195, 0.2);
  font: 500 11px/1.2 'Inter';
  color: #00E5C3;
}
```

**Decision Transparency**
```css
.decision-section {
  padding: 16px;
}

.section-label {
  font: 400 11px/1.2 'Inter';
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #4A5568;
  margin-bottom: 12px;
}

.reasoning-block {
  font: 400 14px/1.7 'Inter';
  color: #8A96A3;
  border-left: 2px solid rgba(0, 229, 195, 0.3);
  padding-left: 16px;
  margin-bottom: 16px;
}
```

**Control Buttons**
```css
.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 16px;
}

.control-button {
  height: 40px;
  border-radius: 8px;
  font: 600 14px/1.2 'Syne';
  transition: all 150ms ease-out;
}

.control-button.approve {
  background: #00E5C3;
  color: #080C10;
}

.control-button.approve:hover {
  filter: brightness(1.08);
  box-shadow: 0 0 16px rgba(0, 229, 195, 0.3);
}

.control-button.reject {
  background: rgba(138, 112, 64, 0.15);
  border: 1px solid rgba(138, 112, 64, 0.4);
  color: rgba(138, 112, 64, 0.9);
}

.control-button.ghost {
  background: transparent;
  border: 1px solid rgba(0, 229, 195, 0.35);
  color: rgba(0, 229, 195, 0.8);
}
```

---

## Animation Specifications

### Node State Transitions
```css
.node {
  transition: 
    border-color 400ms ease-in-out,
    background-color 400ms ease-in-out,
    box-shadow 400ms ease-in-out,
    opacity 400ms ease-in-out;
}
```

### Rotating Arc (Executing State)
```css
@keyframes rotating-arc {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.arc-indicator {
  animation: rotating-arc 2.5s ease-in-out infinite;
}
```

### Breathing Border (Approval State)
```css
@keyframes breathing-border {
  0%, 100% {
    border-color: rgba(0, 229, 195, 0.4);
    box-shadow: 0 0 0 1px rgba(0, 229, 195, 0.2);
  }
  50% {
    border-color: rgba(0, 229, 195, 1.0);
    box-shadow: 0 0 0 1px rgba(0, 229, 195, 0.4), 0 0 24px rgba(0, 229, 195, 0.18);
  }
}

animation: breathing-border 1.8s ease-in-out infinite;
```

### Pulse Dot Travel
```css
.pulse-dot {
  animation: travel-path 1.2s ease-in-out infinite;
}

/* Using SVG animateMotion or GSAP MotionPathPlugin */
```

### Button Press
```css
@keyframes button-press {
  0% { transform: scale(1); }
  50% { transform: scale(0.97); }
  100% { transform: scale(1); }
}

.button:active {
  animation: button-press 230ms ease-out;
}
```

---

## Responsive Adaptations

### Tablet (768px - 1024px)
```css
@media (max-width: 1024px) {
  .right-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60vh;
    transform: translateY(100%);
    transition: transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .right-panel.open {
    transform: translateY(0);
  }
  
  .canvas-toolbar {
    width: calc(100% - 48px);
    max-width: 400px;
  }
}
```

---

## Quality Checklist

✅ Every state transition is smooth (400ms ease-in-out)  
✅ Animations encode meaning (arc = thinking, pulse = flow)  
✅ Colors communicate state at a glance  
✅ Hover states provide immediate feedback  
✅ Selection is unmistakable (elevated, glowing)  
✅ Empty states are beautiful, not broken  
✅ Loading states feel intentional, not blocking  
✅ Every interaction has a micro-animation  
✅ The canvas feels infinite and alive  
✅ Active Theory / Igloo quality level achieved

---

**"A single thread of luminous intelligence running through a world of deep darkness."**
