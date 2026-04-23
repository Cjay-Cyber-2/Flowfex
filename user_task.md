# Flowfex Production User Task Checklist

This file covers the work that still requires your action outside the codebase.

The code is already in place for:
- Frontend build and routing
- Backend orchestration server
- Supabase-backed auth, sessions, usage, and API keys
- Agent connection flows: Prompt, Link, SDK, and Live Channel

What is still on you is the operator work: accounts, secrets, providers, hosting, DNS, auth setup, database bootstrap, and final production validation.

## 1. Decide the production topology

You need two deployed surfaces:

1. Frontend static app
   Recommended: Vercel
   Repo already includes:
   - `/vercel.json`
   - `/frontend/vercel.json`

2. Backend Node service
   Recommended: Railway, Render, or Fly.io
   Reason: the backend is a persistent Node server and should not be treated as a static Vercel site.

Recommended public domains:
- Frontend: `https://app.yourdomain.com`
- Backend: `https://api.yourdomain.com`

## 2. Create and configure Supabase

Supabase is not optional if you want production auth, saved sessions, API key management, anonymous-to-auth upgrade, and persisted usage.

Create one Supabase project, then collect these values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`

Where they come from:
- Project URL and anon key: Supabase Dashboard -> Project Settings -> API
- Service role key: Supabase Dashboard -> Project Settings -> API
- JWT secret: Supabase Dashboard -> Project Settings -> API
- Postgres connection string: Supabase Dashboard -> Database -> Connection string

## 3. Apply the database schema

The required schema is in:
- [supabase/migrations/001_initial_schema.sql](/home/gamp/Flowfex/supabase/migrations/001_initial_schema.sql:1)

Apply it using one of these approaches:

1. Supabase SQL editor
   Paste the migration and run it.

2. CLI / direct Postgres connection
```bash
psql "$DATABASE_URL" -f supabase/migrations/001_initial_schema.sql
```

After the migration, verify these objects exist:
- `profiles`
- `sessions`
- `execution_events`
- `usage_tracking`
- `api_keys`
- `flows`
- RPC functions for anonymous session creation and upgrade
- RLS policies on the above tables

## 4. Configure Supabase Auth

The app supports:
- Email/password sign-up and sign-in
- Google OAuth
- GitHub OAuth
- Anonymous session creation before sign-in

### Required Auth settings

Set Supabase Auth values for your real frontend:
- Site URL: `https://app.yourdomain.com`
- Redirect URLs:
  - `https://app.yourdomain.com/dashboard`
  - `http://localhost:3000/dashboard`
  - Any preview/staging frontend URLs you actually use

Why this matters:
- `lib/auth/service.ts` sends sign-up and OAuth redirects to `/dashboard`
- If these URLs are missing in Supabase, sign-in/sign-up redirects will fail

### Email/password

If you want email sign-up:
- Enable email provider in Supabase Auth
- Decide whether email confirmation is required
- Configure your email sender / SMTP in Supabase if you want branded mail
- Test:
  - sign up
  - email confirmation
  - post-confirmation redirect to `/dashboard`

### Google OAuth

If you want Google sign-in:
- Create a Google OAuth app in Google Cloud
- Add the callback URL Supabase gives you
- Paste the Google client ID and secret into Supabase Auth -> Providers -> Google
- Test sign-in end to end

### GitHub OAuth

If you want GitHub sign-in:
- Create a GitHub OAuth app
- Add the callback URL Supabase gives you
- Paste the GitHub client ID and secret into Supabase Auth -> Providers -> GitHub
- Test sign-in end to end

If you do not plan to support Google or GitHub at launch, disable those buttons in product planning or leave the providers disabled and accept that those buttons will fail until configured.

## 5. Set production environment variables

The repo-level source of truth is:
- [.env.example](/home/gamp/Flowfex/.env.example:1)

Important implementation detail:
- The backend loads `.env` from repo root and `backend/.env` if present
- The frontend is built with Vite, so public env vars must be present in the frontend build environment
- Vite is configured to expose both `VITE_*` and `NEXT_PUBLIC_*`

### Required variables

| Variable | Where to set it | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend build env + backend runtime | Yes | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend build env + backend runtime | Yes | Browser auth/session access |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Yes | Server-side Supabase admin access |
| `SUPABASE_JWT_SECRET` | Backend only | Yes | Supabase JWT support |
| `DATABASE_URL` | Backend only | Yes | Direct DB access / migration tooling |
| `VITE_APP_URL` | Frontend build env | Yes | Public app origin used for redirects |
| `VITE_BACKEND_URL` | Frontend build env | Yes | Backend base URL used by the frontend |
| `FLOWFEX_PUBLIC_ORIGIN` | Backend runtime | Yes | Public backend origin used when generating connect links |
| `ALLOWED_ORIGINS` | Backend runtime | Yes | Comma-separated frontend origins allowed by CORS and Socket.io |
| `PORT` | Backend runtime | Yes | Backend listening port |

### Strongly recommended variables

| Variable | Required level | Purpose |
| --- | --- | --- |
| `FLOWFEX_LINK_SECRET` | Strongly recommended | Stable secret used for connect links; set this explicitly so generated links do not depend on a random boot-time secret |
| `OPENAI_API_KEY` or `GROQ_API_KEY` or `ANTHROPIC_API_KEY` | Required if orchestration should use an LLM provider | Enables real tool/LLM execution |
| `FLOWFEX_CONNECTION_API_KEY` | Optional hardening | Shared server-level connection secret for unauthenticated API connections |

### LLM provider note

The backend currently resolves provider priority in this order:
1. `GROQ_API_KEY`
2. `OPENAI_API_KEY`
3. `ANTHROPIC_API_KEY`

So do one of these:
- Set only the provider you actually want to use
- Or be aware that if multiple keys are set, Groq wins first

## 6. Deploy the frontend

The frontend deployment instructions already exist in:
- [VERCEL_DEPLOYMENT.md](/home/gamp/Flowfex/VERCEL_DEPLOYMENT.md:1)

You must choose one of these Vercel modes:

1. Root directory = repo root `.`
   Uses `/vercel.json`

2. Root directory = `frontend`
   Uses `/frontend/vercel.json`

Before you ship:
- Set frontend build env vars in Vercel
- Confirm SPA rewrites work
- Verify these routes on refresh:
  - `/`
  - `/signin`
  - `/signup`
  - `/dashboard`
  - `/canvas`
  - `/settings`

Important:
- Every change to `VITE_*` or `NEXT_PUBLIC_*` values requires a redeploy of the frontend

## 7. Deploy the backend

Backend runtime entry:
```bash
cd backend
npm start
```

What `npm start` does:
- builds orchestration TypeScript
- starts the Node backend

You need a host that supports a long-running Node process.

Required backend deployment actions:
- Set all backend env vars
- Expose the chosen port
- Serve HTTPS in production
- Make sure WebSocket / Socket.io traffic is allowed
- Set `FLOWFEX_PUBLIC_ORIGIN` to the real public backend URL
- Set `ALLOWED_ORIGINS` to the real frontend origin list

Example:
```env
FLOWFEX_PUBLIC_ORIGIN=https://api.yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com,https://staging-app.yourdomain.com
```

## 8. DNS and TLS

You need to complete the non-code hosting work:
- Point the frontend domain to Vercel
- Point the backend domain to your Node host
- Wait for TLS certificates to be valid
- Verify:
  - `https://app.yourdomain.com`
  - `https://api.yourdomain.com`

Do not launch with mixed origins like:
- frontend on HTTPS
- backend on plain HTTP

That will break secure browser behavior and WebSocket expectations.

## 9. Generate your first Flowfex API key

This is required if you want clean production use of SDK or live-channel connections without relying on an active signed-in browser session.

How to do it:
1. Launch the app with Supabase correctly configured
2. Create a real user account
3. Sign in
4. Go to `Settings -> API`
5. Generate a labeled key
6. Copy it immediately

Important:
- The UI only shows the raw key once
- Store it in your password manager or secret manager immediately
- Revoke and reissue if it leaks

This behavior is visible in:
- [frontend/src/pages/Settings.jsx](/home/gamp/Flowfex/frontend/src/pages/Settings.jsx:210)

## 10. Understand connection security in production

Current behavior:
- Prompt and link connections can work without a user API key
- SDK and live-channel connections require either:
  - a valid Flowfex API key, or
  - a valid authenticated Supabase user context

This rule is enforced in:
- [backend/src/server/FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:332)

Optional extra hardening:
- Set `FLOWFEX_CONNECTION_API_KEY`
- Use it for server-to-server or restricted external connection flows

## 11. Review the current skill-ingestion issues

I ran this report:
```bash
cd backend
npm run skills:report
```

Current result in this repo:
- 276 loaded tools
- 42 blocked skills
- 39 duplicate candidates

You need to decide what to do with that catalog before calling the installation fully production-clean.

### Highest-risk skills

These should remain blocked unless you intentionally want dangerous behavior:
- `skill.security.unsafe-secret-extractor`
- `skill.dangerous-exfiltration`

### What to review manually

1. Duplicate-content skills
   Many multi-agent-team and game-agent docs are duplicated across source trees.

2. Quality-blocked skills
   Some skills are blocked for low quality or malformed content.

3. Hidden/prompt-injection patterns
   Keep those blocked unless you have a documented reason to permit them.

Recommended operator action:
- Run `npm run skills:report`
- Save the report output
- Decide which duplicate source tree is canonical
- Remove or quarantine duplicate markdown from the non-canonical source
- Keep risky security/exfiltration examples out of the production registry

## 12. Validate anonymous and authenticated session behavior

This app supports anonymous-first onboarding and later upgrade into an authenticated user.

You need to test this flow manually:

1. Open the app with no sign-in
2. Confirm an anonymous session is created
3. Start a session and interact normally
4. Sign up or sign in
5. Confirm the anonymous session upgrades correctly
6. Confirm the dashboard still shows the expected session after upgrade

Why this matters:
- The product explicitly promises anonymous-first usage before sign-up
- Session upgrade is a real production path, not a demo-only path

## 13. Run the production verification commands yourself

From this repo, the minimum manual verification set is:

```bash
cd frontend
npm install
npm run lint
npm run build

cd ../backend
npm install
npm run build:orchestration
npm run skills:report
```

Then start the backend and frontend in their actual deployment environments and test the live app.

## 14. Manual acceptance checklist before launch

Complete all of these with the real deployed URLs:

### Frontend and routing
- Landing page loads correctly
- Hero section fills the first screen correctly
- `/signin` loads on direct visit
- `/signup` loads on direct visit
- `/dashboard` loads after auth
- `/settings` loads after auth
- Hard refresh on any route does not 404

### Auth
- Email sign-up works
- Email confirmation works
- Email sign-in works
- Google sign-in works if enabled
- GitHub sign-in works if enabled
- Sign-out works

### Sessions
- Anonymous session creation works
- Anonymous session validation works
- Anonymous-to-authenticated upgrade works
- Recent authenticated session restore works

### API key management
- Generate key works
- Key is shown once
- Key can be used for SDK/live connection
- Revoke key works

### Agent connection flows
- Prompt tab works
- Link tab works
- SDK tab works with a valid API key
- Live Channel tab works with a valid API key
- A real external agent can actually attach
- Session sync state moves from waiting to connected

### Usage limits

Verify the actual enforced limits match your launch plan:
- Anonymous:
  - 3 executions per session
  - 15 nodes per session
  - 30 minute session duration
  - 1 concurrent connected agent
- Authenticated:
  - 50 executions per day
  - 500 nodes per day
  - 480 minute session duration
  - 5 concurrent connected agents

These values come from:
- [lib/limits/config.ts](/home/gamp/Flowfex/lib/limits/config.ts:1)

If those numbers are not acceptable for launch, change them before production.

## 15. Secret-handling rules you need to enforce operationally

Do this:
- Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only
- Keep raw API keys in a secret manager
- Rotate leaked keys immediately
- Set `FLOWFEX_LINK_SECRET` explicitly in production
- Keep production and staging secrets separate

Do not do this:
- Put `SUPABASE_SERVICE_ROLE_KEY` in frontend env
- Commit real secrets into `.env`
- Reuse a dev OAuth app in production
- Reuse the same API key across team members without ownership tracking

## 16. What is already done in code, so you do not need to repeat it manually

You do not need to manually implement:
- SPA rewrite config files for Vercel
- Supabase browser/client wrappers
- Backend connection routes
- API key CRUD UI
- Session creation and upgrade logic
- Frontend build pipeline
- Backend build script

You only need to supply the infrastructure, secrets, provider setup, and final operator verification.

## 17. Final recommended order of operations

Follow this order:

1. Create the Supabase project
2. Apply the SQL migration
3. Configure auth providers and redirect URLs
4. Fill production env vars
5. Deploy backend
6. Deploy frontend
7. Verify CORS and real backend connectivity
8. Create a real user account
9. Generate your first Flowfex API key
10. Test Prompt, Link, SDK, and Live Channel attach flows
11. Review blocked and duplicate skills
12. Run the launch acceptance checklist

If you complete every item in this file, you will have covered the production tasks that still require human action outside the code.
