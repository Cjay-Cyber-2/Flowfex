---
name: code
description: |
  General high-quality coding for the connected AI assistant: structure, testing,
  readability, and safe incremental changes.
metadata:
  source: syniq-catalog
tags: [code, engineering, syniq]
category: code
---

# Code

## Standards

- Match project conventions, formatter, and stack
- Small focused diffs; one logical concern per change
- Explicit error handling on boundaries (API, I/O, user input)
- Tests for behavior changes when a test harness exists
- No drive-by refactors or unrelated file edits

## Process

1. Understand goal and constraints
2. List files to touch
3. Implement with minimal surface area
4. Verify (lint, test, typecheck as available)
5. Summarize changes and how to validate

## With Syniq

Compulsory review and architecture skills still apply — speed does not skip them.
