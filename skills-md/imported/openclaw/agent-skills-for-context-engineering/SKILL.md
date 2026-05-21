---
name: agent-skills-for-context-engineering
description: |
  Compulsory context engineering for every Syniq request — structure prompts, memory,
  tool results, and skill outputs so the connected assistant stays within useful context.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [context, engineering, skills, syniq]
category: ai
---

# Context Engineering (Syniq compulsory)

## Goals

- Right information in the window at the right time
- Minimal noise; maximal signal
- Stable references (paths, IDs) over pasted blobs

## Practices

1. **Summarize** old turns; keep decisions and open questions
2. **Chunk** large files — cite ranges, do not paste wholesale
3. **Prioritize** Syniq-returned skills/tools at top of working context
4. **Separate** system rules, user ask, evidence, and draft answer
5. **Compress** with token-optimizer without dropping safety or requirements

## Per request

- What context is required to act?
- What can be dropped?
- What must be fetched next?

## Output

When context was trimmed, note what was summarized vs omitted (one line).
