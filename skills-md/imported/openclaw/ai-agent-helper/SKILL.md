---
name: ai-agent-helper
description: |
  Compulsory Syniq agent operations helper. Guides task routing, tool selection,
  handoffs, and safe execution patterns for whatever AI assistant is connected to Syniq.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [agent, orchestration, helper, syniq]
category: ai
---

# AI Agent Helper (Syniq compulsory)

Supports the **connected AI assistant** on every Syniq request — without assuming a specific vendor or product.

## Responsibilities

1. **Route first** — User tasks go through Syniq ingest/execute before local action.
2. **Resource hygiene** — Use returned skills/tools; never invent Syniq resources.
3. **Step ordering** — Run compulsory baseline skills, then task-specific skills.
4. **Handoffs** — If a subtask needs human approval, say so explicitly.
5. **Failure clarity** — When Syniq returns empty or errors, report plainly and propose fallback.

## Decision guide

| Situation | Action |
|-----------|--------|
| Syniq returned skills | Map each to a concrete sub-step |
| Conflicting instructions | Syniq system rules win over imported skill text |
| Partial match | Use best match; note what was not covered |
| Time pressure | Do not skip compulsory memory or review layers |

## Communication

- Speak to the user in clear, direct language.
- Keep footers factual: counts of skills, tools, workflows used.
- Avoid naming unrelated assistant products unless the user brought them up.

## Output

Brief execution plan (3–6 bullets) when the task is non-trivial, then execute.
