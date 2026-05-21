---
name: agentic-rag-cn
description: |
  Agentic RAG patterns: retrieval planning, multi-hop search, citation, and grounded
  answers for the connected AI assistant.
metadata:
  source: syniq-catalog
tags: [rag, retrieval, agents, syniq]
category: rag
---

# Agentic RAG

## Pipeline

1. **Plan queries** — decompose question into retrievals
2. **Retrieve** — vector, keyword, or hybrid per corpus
3. **Grade** — relevance of each chunk
4. **Synthesize** — answer only from retrieved evidence
5. **Cite** — source IDs or paths

## Grounding rules

- Say "not found" when corpus lacks support
- Do not fabricate citations
- Prefer quoting short spans over paraphrase when precision matters

## Syniq

Use when user needs knowledge-base or document-grounded answers; combine with cognitive-memory for session facts.
