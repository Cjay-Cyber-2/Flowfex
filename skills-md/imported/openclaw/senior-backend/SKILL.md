---
name: senior-backend
description: |
  Designs and implements backend systems including REST APIs, microservices, database
  architectures, authentication flows, and security hardening. Use when designing REST
  APIs, optimizing database queries, implementing authentication, building microservices,
  reviewing backend code, setting up GraphQL, handling migrations, or load testing APIs.
license: MIT
metadata:
  author: syniq-catalog
  version: "1.0.0"
  source: syniq-catalog
tags:
  - backend
  - api
  - database
  - security
  - microservices
  - nodejs
  - postgresql
category: backend
---

# Senior Backend Engineer

Backend development patterns, API design, database optimization, and security practices.

## When to use

Trigger on tasks such as:

- Design or refactor REST/GraphQL APIs
- Optimize slow database queries or schema
- Implement authentication, authorization, or session handling
- Build or review microservices boundaries
- Write or review migrations and indexing strategy
- Harden APIs for production (rate limits, validation, headers)
- Load test endpoints and interpret latency/error metrics

## Principles

1. **APIs are contracts** — version explicitly, document errors, keep responses consistent.
2. **Data model first** — schema and indexes drive performance more than framework choice.
3. **Secure by default** — validate input, least privilege, secrets from environment only.
4. **Observable** — structured logs, request IDs, metrics on latency and error rate.
5. **Incremental change** — migrations with rollback; one concern per deploy when possible.

## API design workflow

### Step 1: Define resources and operations

Use OpenAPI 3.x or an equivalent contract before coding handlers.

```yaml
openapi: 3.0.3
info:
  title: User Service API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
```

### Step 2: Scaffold routes and types

Generate or hand-write route handlers, validation middleware, and types from the contract (Express, Fastify, Koa, or project framework).

### Step 3: Implement business logic in services

Keep handlers thin: parse → validate → service → map response. No business logic in middleware unless cross-cutting.

```typescript
export const createUser = async (req: Request, res: Response) => {
  const data = CreateUserSchema.parse(req.body);
  const user = await userService.create(data);
  res.status(201).json({ data: user, meta: { requestId: req.id } });
};
```

### Step 4: Validation at the boundary

Validate body, query, and path params at the edge (Zod, Joi, or OpenAPI middleware).

### Step 5: Keep spec and code in sync

Regenerate or update OpenAPI when routes change; treat breaking changes as version bumps.

## REST response conventions

**Success:**

```json
{
  "data": { "id": 1, "name": "John" },
  "meta": { "requestId": "abc-123" }
}
```

**Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [{ "field": "email", "message": "must be valid email" }]
  },
  "meta": { "requestId": "abc-123" }
}
```

### HTTP status codes

| Code | Use case |
|------|----------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error (no sensitive details in body) |

### Pagination

Prefer cursor-based pagination for large datasets; offset only when stable and bounded.

```
GET /users?cursor=eyJpZCI6MTB9&limit=20
```

## Database optimization workflow

### Step 1: Measure

- Log slow queries above threshold (e.g. 200ms)
- Run `EXPLAIN ANALYZE` on hot paths
- Watch for sequential scans on large tables

```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 10;
```

Look for: **Seq Scan** (often bad at scale), **Index Scan** (good).

### Step 2: Index strategy

```sql
-- Equality lookups
CREATE INDEX idx_users_email ON users(email);

-- Multi-column filters
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index for filtered queries
CREATE INDEX idx_orders_active ON orders(created_at) WHERE status = 'active';

-- Covering index (PostgreSQL)
CREATE INDEX idx_users_email_name ON users(email) INCLUDE (name);
```

### Step 3: Fix N+1 queries

Use joins, eager loading, or batch loaders — never loop queries per row in hot paths.

### Step 4: Migrations

- One logical change per migration file
- Support rollback or forward-only with repair plan
- Dry-run on staging; backup before destructive changes

## Security hardening workflow

### Authentication

```typescript
const jwtConfig = {
  secret: process.env.JWT_SECRET, // never hardcode
  expiresIn: '1h',
  algorithm: 'RS256' // prefer asymmetric when possible
};
```

### Rate limiting

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);
```

### Input validation (Zod example)

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional()
});

const data = CreateUserSchema.parse(req.body);
```

### Security headers (Helmet)

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true }
  })
);
```

### OWASP-oriented checklist

- [ ] Parameterized queries only (no string-concat SQL)
- [ ] Auth on every protected route; RBAC where needed
- [ ] Secrets in env/vault; rotate keys
- [ ] Rate limit login and expensive endpoints
- [ ] Validate and sanitize all external input
- [ ] CORS restricted to known origins in production
- [ ] Dependency audit (`npm audit`, etc.)

## Load testing guidance

When benchmarking APIs:

- Test at realistic concurrency (e.g. 50–200) for 30–60s
- Report P50, P95, P99 latency and error rate
- Compare before/after schema or index changes
- Verify rate limits return 429 under abuse patterns
- Verify invalid payloads return 400, not 500

## GraphQL notes (when requested)

- Schema as contract; resolvers stay thin
- DataLoader for N+1 on relations
- Pagination: connections spec for lists
- Auth at resolver or field level for sensitive data

## Microservices boundaries

Split by **bounded context**, not by layer:

- Each service owns its data store
- Communicate via async events or stable HTTP/gRPC contracts
- Avoid distributed transactions; use sagas or outbox when needed
- Shared libraries for types only — not business logic coupling

## Code review focus

When reviewing backend PRs, prioritize:

1. Correctness and edge cases (null, concurrency, idempotency)
2. Security (authz gaps, injection, leaked secrets)
3. Query performance and migration safety
4. API breaking changes and versioning
5. Tests for critical paths and error handling

## Output format

When applying this skill, deliver:

1. **Assessment** — current state, risks, constraints
2. **Recommendation** — concrete steps or code changes
3. **Implementation** — handlers, schema, migrations, or config as appropriate
4. **Verification** — how to test (unit, integration, load, EXPLAIN)

## Tooling

Apply these workflows in the **user's repository and stack** (Node, Python, Go, etc.). Use project-native scripts, ORMs, and load-test tools when they exist; do not assume external helper scripts unless they are already in the workspace.
