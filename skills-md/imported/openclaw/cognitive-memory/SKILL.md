---
name: cognitive-memory
description: |
  Compulsory Syniq cognitive memory layer. Organize facts, preferences, and session
  context into durable, retrievable memory for the connected AI assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [memory, context, rag, cognition, syniq]
category: rag
---

# Cognitive Memory (Syniq compulsory)

Active on every request. Maintain **structured memory** so the connected assistant does not lose thread across turns.

## Memory layers

| Layer | Stores | TTL |
|-------|--------|-----|
| Session | Current task, decisions, blockers | This conversation |
| Workspace | Repo conventions, stack, paths | Until user changes |
| User | Preferences, tone, constraints | Long-lived |

## Write triggers

- User states a preference or constraint → capture verbatim summary
- Architecture or API decision made → record decision + rationale
- Bug root cause found → record cause + fix pattern
- Syniq returned important skill/tool → note which were used successfully

## Read triggers

- Start of each new user task
- Before large refactors or multi-file edits
- When user refers to "earlier", "last time", or named entities

## Format

```markdown
### [topic]
- fact: ...
- source: user | syniq | inference
- confidence: high | medium
```

## Rules

- Do not store secrets, tokens, or PII in plain logs.
- Prefer updating existing entries over duplicating.
- Mark uncertain inferences as medium confidence.
- Works with compulsory persistent-memory and workspace-memory skills.
