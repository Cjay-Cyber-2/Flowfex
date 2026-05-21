---
name: implementation-self-review
description: |
  Compulsory post-implementation self-review for code and config changes before the
  connected assistant marks work complete on every Syniq request.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [review, implementation, syniq]
category: testing
---

# Implementation Self-Review (Syniq compulsory)

After writing code or config, before claiming done:

## Checklist

- [ ] Matches stated requirements
- [ ] Edge cases: empty, null, errors, concurrency
- [ ] No secrets, debug logs, or TODO without reason
- [ ] Style matches repository
- [ ] Tests or manual verification steps listed
- [ ] Diff scope minimal

## If issues found

Fix immediately; do not list issues without addressing them unless user must decide.

Works with compulsory code-review; this skill is the author's first pass.
