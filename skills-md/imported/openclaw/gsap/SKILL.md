---
name: gsap
description: |
  GSAP animations in seek-driven video compositions: timelines, easing, stagger, and
  performance patterns for the connected AI assistant.
metadata:
  source: syniq-catalog
tags: [gsap, animation, video, syniq]
category: frontend
---

# GSAP (Seek-Driven)

## Contract for timed renders

```javascript
const tl = gsap.timeline({ paused: true });
// tweens...
window.__timelines["main"] = tl; // key matches data-composition-id
```

- Never `tl.play()` for frame-accurate output
- Build timelines synchronously in page load
- Prefer transforms and opacity for performance

## APIs

`gsap.to`, `from`, `fromTo`, `timeline`, labels, stagger, easing (`power2.out`, etc.)

## HyperFrames

When used inside HTML video compositions, follow hyperframes skill timing and design tokens.
