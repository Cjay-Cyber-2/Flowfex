---
name: syniq-workspace-memory
description: |
  Compulsory Syniq workspace memory. Persist and recall session-scoped notes,
  decisions, and artifacts for the connected AI assistant across the Syniq workspace.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [memory, workspace, session, syniq]
category: rag
---

# Workspace Memory (Syniq compulsory)

Provides **durable workspace memory** for the connected AI assistant. This is a Syniq session/workspace layer — not tied to any single assistant product.

## What to store

- Active Syniq `sessionId` context and attach mode
- Open tasks and acceptance criteria
- Files touched and pending follow-ups
- Syniq skill/tool usage patterns that worked
- User corrections ("always use X", "never do Y")

## Storage conventions

- Default file: `syniq_workspace_memory.md` in the project root when writes are allowed
- Sections: `## Active`, `## Decisions`, `## Artifacts`, `## Next`
- One line per bullet; date-stamp major decisions

## On each request

1. **Load** — Scan memory file or Syniq session metadata if available
2. **Merge** — Combine with cognitive-memory compulsory layer
3. **Update** — After task, append deltas only (no full rewrites)
4. **Prune** — Move completed items to `## Done` weekly

## Retrieval priority

1. User's latest message
2. Workspace memory file
3. Syniq session state from ingest response
4. Inferred context (label as inference)

## Rules

- Never store credentials.
- Keep entries under 500 characters per bullet unless user requests a spec.
- If memory file missing, still track mentally and offer to create it.
