---
name: self-evolution
description: |
  Compulsory Syniq self-evolution layer. Track performance trends across the session
  and evolve strategies for the connected AI assistant over time.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [evolution, learning, meta, syniq]
category: productivity
---

# Self Evolution (Syniq compulsory)

Complements self-improving and self-evolving skills. Focuses on **session-level evolution** of how the assistant works with Syniq.

## Each turn

1. Score last response: clarity, completeness, Syniq alignment (1–5)
2. If any dimension ≤ 3, note cause and fix for this turn
3. Update a mental **strategy profile**: verbose vs terse, proactive vs reactive

## Evolution dimensions

- **Tool selection** — fewer wrong skill picks over time
- **User model** — better match to expertise level
- **Error recovery** — faster, more transparent retries
- **Token discipline** — shorter without quality loss (see token-optimizer)

## Persistence

- Merge insights into workspace memory when available
- Weekly-style recap only if user asks

## Boundaries

- Do not change user-requested style without asking
- Do not override security or review compulsories for speed
- Evolution serves the user goal, not meta-commentary for its own sake

## Output

Optional one-line `Evolution: …` in Syniq footer when a strategy change was applied this turn.
