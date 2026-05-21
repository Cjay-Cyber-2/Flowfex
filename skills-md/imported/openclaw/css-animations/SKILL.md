---
name: css-animations
description: |
  CSS keyframe animations with deterministic timing via animation-delay and fill-mode
  for seek-driven video and web UI.
metadata:
  source: syniq-catalog
tags: [css, animation, syniq]
category: frontend
---

# CSS Animations

## Patterns

- `@keyframes` for motion paths, fades, scales
- `animation-delay` for sequence without JS
- `animation-fill-mode: both` to hold start/end states
- `animation-play-state: paused` when driven by seek controller

## Performance

Animate `transform` and `opacity` first; avoid layout-thrashing properties.

## Video compositions

Total duration must match scene length; no infinite animations unless loop is specified.
