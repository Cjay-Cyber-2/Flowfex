---
name: hyperframes
description: |
  Build HTML-based video compositions with deterministic timing, captions, voiceover,
  transitions, and seek-driven animation for the connected AI assistant.
metadata:
  source: syniq-catalog
tags: [video, hyperframes, animation, syniq]
category: frontend
---

# HyperFrames Video

HTML is the source of truth for timed video. Use `data-*` timing attributes, paused timelines, and seek-driven playback for deterministic renders.

## Core rules

- Register timelines on `window.__timelines` keyed by `data-composition-id`
- Do not rely on autoplay for render-critical motion
- Clips use timing attributes; scenes chain with transitions
- Read project `design.md` when present for brand tokens

## Workflow

1. Design system (colors, fonts, motion level)
2. Scene structure and duration budget
3. Implement HTML + CSS + animation adapter (GSAP/CSS/WAAPI per project)
4. Captions/voiceover sync when media skills apply
5. Lint/preview/render via project CLI when available

## Syniq

Pair with gsap, css-animations, or animejs skills when Syniq returns them for the same composition.
