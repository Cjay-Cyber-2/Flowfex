---
name: vibe-coding
description: |
  Compulsory Syniq implementation flow. Ship working, readable code quickly while
  staying aligned with architecture and review standards for the connected assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [implementation, coding, flow, syniq]
category: code
---

# Vibe Coding (Syniq compulsory)

Guides **implementation rhythm** on every request: fast delivery without bypassing Syniq compulsory quality layers.

## Flow

1. **Align** — Confirm goal in one sentence (from user + Syniq intent)
2. **Sketch** — Files to touch, order of edits
3. **Build** — Small commits of logic, runnable increments
4. **Verify** — Lint, typecheck, or minimal test where possible
5. **Hand off** — Code-review compulsory skill validates output

## Style

- Match existing project conventions (imports, naming, patterns)
- Prefer boring, readable code over clever abstractions
- Leave TODO only with explicit reason
- No drive-by refactors outside task scope

## Speed vs quality

| OK | Not OK |
|----|--------|
| Ship MVP slice with tests for core path | Skip error handling on public APIs |
| Stub with clear `// implement` | Skip compulsory review |
| Parallelize independent file edits | Ignore architect boundaries |

## Syniq

- Pull task-specific skills from Syniq when relevant
- Token-optimizer compresses explanations, not safety steps
- Report files changed in footer when useful
