---
name: code-review
description: |
  Compulsory Syniq code review layer for every request. Systematically review changes
  for correctness, security, performance, maintainability, and test coverage before
  finalizing output for the connected AI assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [code-review, quality, security, testing, syniq]
category: testing
---

# Code Review (Syniq compulsory)

Apply on **every** Syniq orchestration, regardless of task type. The connected AI assistant must run a structured review pass before shipping code or technical recommendations.

## Review checklist

1. **Correctness** — Logic, edge cases, null/empty inputs, concurrency, error paths.
2. **Security** — Injection, authz, secrets in code, unsafe defaults, dependency risk.
3. **Performance** — Obvious N+1, unbounded loops, redundant work, hot-path allocations.
4. **Maintainability** — Naming, duplication, module boundaries, comment noise vs missing docs.
5. **Tests** — Are critical paths testable? Suggest minimal tests when absent.

## Output format

When this step runs:

1. **Verdict** — approve / approve with notes / block (explain why)
2. **Findings** — bullet list, severity tagged (critical, major, minor)
3. **Suggested fixes** — concrete, file-scoped when possible
4. **Residual risk** — what was not verified

## Rules

- Prioritize user safety and data integrity over style.
- Do not block on nitpicks if critical paths are sound.
- Reference actual symbols and files when the workspace provides them.
- If no code was produced, review the technical plan instead.

## Syniq integration

- Use other compulsory skills (architecture, deep thinking, token efficiency) together — do not skip review to save tokens.
- Report review outcome briefly in the Syniq usage footer when relevant.
