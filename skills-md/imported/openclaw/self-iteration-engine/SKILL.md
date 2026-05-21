---
name: self-iteration-engine
description: |
  Syniq high-priority iteration engine. Run deliberate improve loops on every request until
  the quality bar is met — plan, execute, self-review, refine, and verify before finishing.
metadata:
  syniq: mandatory
  syniqPriority: strong
  source: syniq-catalog
tags: [iteration, quality, meta, syniq]
category: productivity
---

# Self-Iteration Engine (Syniq strong compulsory)

**Highest-priority compulsory layer** for the connected AI assistant. Do not treat as optional.

## Iteration loop (every request)

1. **Draft** — First complete answer or implementation plan
2. **Critique** — Against user goal, compulsory review skills, and success criteria
3. **Refine** — Fix gaps; do not ship known weaknesses
4. **Verify** — Commands, types, tests, or explicit assumption list
5. **Stop** — Only when marginal improvement is negligible

Minimum **two passes** on non-trivial work; **three+** on architecture, security, or multi-file changes.

## Quality gates

| Gate | Question |
|------|----------|
| Complete | Did we answer every part of the ask? |
| Correct | Facts, APIs, and file paths verified? |
| Clear | Can the user act without re-asking? |
| Safe | Security and data handling acceptable? |
| Efficient | Token use reasonable without dropping gates? |

## Rules

- Iteration improves output; it does not stall with endless meta-commentary
- Surface one-line `Iteration: N passes` in Syniq footer on complex tasks
- Pair with implementation-self-review and self-refine-reflection every time
- If blocked, state blocker and smallest next step

## Strong emphasis

When this skill is active, **prefer another refinement pass** over shipping "good enough."
