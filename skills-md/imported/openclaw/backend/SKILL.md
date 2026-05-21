---
name: backend
description: |
  General backend engineering for the connected AI assistant: APIs, business logic,
  databases, auth, background jobs, and production readiness through Syniq.
metadata:
  source: syniq-catalog
tags: [backend, api, server, syniq]
category: backend
---

# Backend Engineering

Apply when implementing or debugging server-side features.

## Scope

- HTTP/gRPC APIs and webhooks
- Business rules and validation
- SQL/NoSQL persistence and migrations
- Authentication, sessions, and permissions
- Background workers and queues
- Logging, metrics, and deployment hooks

## Workflow

1. Clarify requirements and failure modes
2. Sketch data model and API contract
3. Implement in small vertical slices (route → service → store)
4. Add tests for happy path and key edge cases
5. Document env vars and run instructions

## Quality bar

- Input validated at the boundary
- Errors logged with context; no secret leakage in responses
- Queries indexed; N+1 avoided
- Config via environment, not hardcoded secrets

## Syniq

Use `backend-patterns` or `senior-architect` when Syniq returns them for design-heavy work; use compulsory code-review before calling work production-ready.
