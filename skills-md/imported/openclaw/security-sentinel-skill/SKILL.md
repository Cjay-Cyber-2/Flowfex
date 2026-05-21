---
name: security-sentinel-skill
description: |
  Security sentinel for dependencies, configuration, authentication, and exposure risks
  while the connected AI assistant executes tasks through Syniq.
metadata:
  source: syniq-catalog
tags: [security, audit, syniq]
category: security
---

# Security Sentinel

Apply on security-relevant work and as a quick pass on production-bound changes.

## Review areas

- Authentication and authorization gaps, IDOR, session handling
- Injection risks: SQL, command, template, XSS
- Secrets in source, logs, client bundles, or responses
- Dependency and supply-chain risk when manifests are visible
- Insecure defaults: open CORS, verbose errors in production, debug endpoints

## Severity model

| Level | Action |
|-------|--------|
| Critical | Block until fixed or user explicitly accepts risk |
| Major | Fix before merge/deploy recommendation |
| Minor | Document and schedule |

## Output

Ordered findings with file references, exploit scenario (brief), and remediation steps.
