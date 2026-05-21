---
name: self-evolving-skill
description: |
  Compulsory Syniq skill evolution layer. Detect gaps in how skills are applied,
  propose concrete improvements to workflows, and adapt behavior across the session
  for the connected AI assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [self-improvement, evolution, learning, syniq]
category: productivity
---

# Self-Evolving Skill (Syniq compulsory)

Runs on every request. The connected assistant should **evolve how it uses Syniq skills**, not only complete the immediate task.

## Per-request workflow

1. **Inventory** — Which Syniq skills ran this turn? Which were relevant but unused?
2. **Gap analysis** — What would have produced a better outcome (skill, tool, or step)?
3. **Micro-adjustment** — One change to apply on the next turn (selection, order, depth).
4. **Optional log** — Append a one-line note to `improvement_log.md` if the workspace allows writes.

## Evolution rules

- Prefer proven patterns over experimenting on critical paths.
- Never weaken security, review, or memory compulsory steps to go faster.
- Encode improvements as repeatable habits, not one-off hacks.
- Share only concise deltas with the user unless they ask for a learning log.

## When code or product work was done

- Did compulsory architecture and code-review skills inform the solution?
- Should a new reusable checklist be suggested for this repo?

## Output

Short internal note (2–4 sentences) plus optional user-visible `Evolution: …` line in the Syniq footer.
