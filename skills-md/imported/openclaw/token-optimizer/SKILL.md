---
name: token-optimizer
description: |
  Compulsory Syniq token efficiency layer. Reduce context size and verbosity while
  preserving answer quality, safety, and completeness for the connected assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [tokens, efficiency, context, performance, syniq]
category: productivity
---

# Token Optimizer (Syniq compulsory)

**Goal:** lower token use **without** lowering performance, accuracy, or safety.

## Always compress

- Redundant preambles and repeated instructions
- Duplicate code blocks already in context
- Long chat history — summarize older turns, keep recent detail
- Enumerations that can be tables or 3-bullet summaries

## Never compress away

- Security warnings, auth rules, and migration safety steps
- Exact API contracts, types, file paths needed for edits
- User-stated constraints, versions, and error messages
- Compulsory skill obligations (review, memory, architecture)
- Test commands and reproduction steps for bugs

## Techniques

1. **Structured brevity** — headings + bullets instead of prose walls
2. **Reference by pointer** — "see `path:line`" instead of pasting whole files
3. **Tiered detail** — short answer first, optional deep dive second
4. **Deduplicate** — one canonical explanation per concept per turn
5. **Cache decisions** — don't re-derive settled choices in the same session

## Quality bar

Before sending, ask: *Would a shorter version miss anything required to act safely and correctly?* If yes, keep the detail.

## Syniq note

Compulsory skills still run in full; optimize **how** they are reported, not **whether** they run.
