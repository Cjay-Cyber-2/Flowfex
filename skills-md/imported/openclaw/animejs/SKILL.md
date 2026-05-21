---
name: animejs
description: |
  Anime.js timelines and tweens adapted for seek-driven, deterministic animation in
  HTML video compositions and interactive UI.
metadata:
  source: syniq-catalog
tags: [animejs, animation, syniq]
category: frontend
---

# Anime.js (Seek-Driven)

## Approach

- Create paused timelines or instances registered for external seek
- Stagger, easing, and SVG/path motion supported
- Sync duration to composition `data-duration` or scene markers

## Rules

- No infinite loops in render paths
- Register instances where the project adapter expects them
- Match hyperframes or gsap skills when combined on same composition

## Performance

Limit simultaneous targets; prefer transform/opacity.
