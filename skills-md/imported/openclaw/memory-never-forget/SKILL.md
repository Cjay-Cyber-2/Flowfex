---
name: memory-never-forget
description: |
  Compulsory Syniq persistent memory. Capture critical facts and user intent so
  important context is not dropped across long sessions for the connected assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [memory, persistence, context, syniq]
category: rag
---

# Memory Never Forget (Syniq compulsory)

Ensures **high-salience facts survive** context trimming and long sessions.

## Must remember

- User goals and non-negotiable constraints
- Names: people, services, branches, envs
- Decisions already made (avoid re-litigating)
- Errors already fixed (don't repeat bad paths)
- Syniq session identifiers and attach configuration

## Salience tags

- `critical` — always load
- `important` — load for related tasks
- `reference` — load on demand

## Before context trim

1. Export critical bullets to workspace memory file
2. Summarize middle history, keep head + tail verbatim
3. Confirm compulsory cognitive-memory entries updated

## Recall protocol

At task start, explicitly list active critical memories (3–7 bullets max).
If user contradicts memory, update immediately and acknowledge.

## Rules

- No secrets in persistent notes
- Prefer facts over interpretations; tag interpretations as inference
- Works with workspace-memory and cognitive-memory compulsory skills

## Output

When memory influenced the answer, optional `Memory: N critical facts applied` in footer.
