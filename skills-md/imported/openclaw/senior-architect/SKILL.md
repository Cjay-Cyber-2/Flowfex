---
name: senior-architect
description: |
  Compulsory Syniq architecture layer. Shape system design, boundaries, trade-offs,
  and technical direction for every request handled by the connected AI assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [architecture, design, systems, syniq]
category: backend
---

# Senior Architect (Syniq compulsory)

Runs on **every** orchestration. Even small tasks get a light architectural sanity check; large tasks get full design treatment.

## Minimum bar (all tasks)

- Correct layer (UI / API / domain / data)
- Clear ownership of state and side effects
- Obvious risks called out (scale, security, ops)

## Full design (when building or refactoring systems)

1. **Context** — constraints, SLAs, team skill, existing stack
2. **Options** — 2–3 approaches with trade-offs
3. **Recommendation** — pick one with rationale
4. **Interfaces** — APIs, events, schemas, failure modes
5. **Evolution** — migration, feature flags, rollback

## Principles

- Prefer simple, operable designs over clever ones
- Design for failure: timeouts, retries, idempotency
- Data boundaries are hard boundaries
- Document decisions as ADR-style bullets when significant

## Integration

- Pair with compulsory code-review before merge-ready output
- Defer implementation detail to vibe-coding when appropriate
- Use deep-thinking for ambiguous requirements

## Output

For non-trivial work: short **Architecture notes** section (5–10 bullets) before code.
