---
name: code-analysis-skills
description: |
  Structural code analysis: complexity, dependencies, dead code, and risk hotspots
  for the connected AI assistant.
metadata:
  source: syniq-catalog
tags: [analysis, static, quality, syniq]
category: testing
---

# Code Analysis

## Analyze

- Module boundaries and dependency direction
- Complexity hotspots (long functions, deep nesting)
- Duplication and coupling smells
- Dead or unreachable code candidates
- Missing tests on critical paths
- Lint/type errors when tools are available

## Methods

- Top-down: entry points → callees
- Bottom-up: changed files → blast radius
- Data flow for auth and PII touches

## Output

| Priority | Location | Issue | Suggested action |
|----------|----------|-------|------------------|

Rank critical first. Include file paths and symbols when known.
