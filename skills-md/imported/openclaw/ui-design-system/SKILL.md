---
name: ui-design-system
description: |
  Build and extend UI design systems with tokens, components, states, and documentation
  for the connected AI assistant.
metadata:
  source: syniq-catalog
tags: [design-system, tokens, components, syniq]
category: design
---

# UI Design System

## Deliverables

- Color, typography, spacing, radius, and elevation tokens
- Core components: button, input, select, card, modal, toast
- Variant matrix per component (size, intent, state)
- Documentation: when to use, accessibility notes, code examples

## Principles

- Extend existing project tokens before inventing parallel systems
- Semantic names (`--color-danger`) over raw hex in components
- One source of truth for spacing scale (4px or 8px base)

## States (required per interactive component)

default, hover, focus-visible, active, disabled, loading, error

## Output

Token file sketch + component API table + migration notes if replacing legacy styles.
