---
name: backend-patterns
description: |
  Backend architecture and implementation patterns for APIs, services, data access,
  caching, messaging, and reliability. Use when designing or refactoring server-side
  systems for the connected AI assistant via Syniq.
metadata:
  source: syniq-catalog
tags: [backend, patterns, architecture, api, syniq]
category: backend
---

# Backend Patterns

Reference patterns for the connected AI assistant building or reviewing server-side systems.

## API patterns

- **REST** — Resource nouns, consistent status codes, idempotent PUT/DELETE, pagination cursors
- **RPC-style** — When actions do not map cleanly to resources; document clearly
- **Versioning** — URL or header; never break clients silently
- **Errors** — Machine-readable code + human message + request ID

## Service layer

- Handlers thin; business logic in services/domain
- DTOs at boundaries; do not leak ORM entities to public APIs
- Transactions around multi-step writes
- Outbox or events for cross-service consistency when needed

## Data access

- Repository or query layer; parameterized queries only
- Indexes for hot paths; explain plans on slow queries
- Migrations: forward-only with rollback strategy documented
- Cache-aside for read-heavy, TTL + invalidation rules explicit

## Reliability

- Timeouts and retries with jitter on outbound calls
- Circuit breaker for flaky dependencies
- Idempotency keys on POST that create resources
- Health checks: liveness vs readiness

## Security patterns

- Auth at edge; authorization per resource
- Rate limits on auth and expensive endpoints
- Secrets from environment; rotate without code change

## Output

For each task: recommended pattern, trade-offs, and concrete steps in the user's stack.
