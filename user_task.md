# Flowfex User Task Checklist

This is the single source of truth for work that still requires human action outside the codebase.

How to read this file:
- The first-hosted-tag path is the minimum manual work required to ship the first working Flowfex version from the repo as it exists today.
- Later Neon + Better Auth rollout tasks stay in this same file so the remaining human work is not split across separate deployment/setup markdown files.

The code is already in place for:
- Frontend build and routing
- Backend orchestration server
- Render and Vercel deployment scaffolding
- Agent connection flows: Prompt, Link, SDK, and Live Channel

What is still on you is the operator work: accounts, secrets, providers, hosting, DNS, final env wiring, and live production validation.

## 1. Preferred production topology

Recommended stack for this repo:
- Frontend: Vercel
- Backend: Render
- Database: Neon

Do not plan around a Vercel-only deployment for the current Flowfex architecture.

Why:
- The frontend is a static SPA and fits Vercel well.
- The backend is a long-running Node server with Socket.io namespaces and HTTP endpoints.
- The backend must stay online for real-time orchestration, agent connections, session APIs, and auth APIs.

You need two deployed surfaces:

1. Frontend static app
   Recommended: Vercel
   Repo already includes:
   - `/vercel.json`
   - `/frontend/vercel.json`

2. Backend Node service
   Recommended: Render
   Reason: the backend is a persistent Node server and should not be treated as a static Vercel site.

Recommended public domains:
- Frontend: `https://app.yourdomain.com`
- Backend: `https://api.yourdomain.com`

## 2. What is already implemented for Render

The backend foundation that Render needs is already present in code:
- A real backend start command exists in [backend/package.json](/home/gamp/Flowfex/backend/package.json:1) as `npm start`
- The backend reads the platform-injected `PORT` in [FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:29)
- The backend now binds to `0.0.0.0` by default, which is correct for cloud deployment, in [FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:29)
- The backend exposes a health endpoint at `/health` in [FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:160)
- Socket.io is already attached to the backend server in [FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:59)
- CORS and public origin settings are already driven by `ALLOWED_ORIGINS` and `FLOWFEX_PUBLIC_ORIGIN` in [FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:64)
- A repo-root Render Blueprint now exists at [render.yaml](/home/gamp/Flowfex/render.yaml:1)

What this means:
- You do not need additional Render-specific application code just to get the current backend online.
- You can either import [render.yaml](/home/gamp/Flowfex/render.yaml:1) into Render or create the Web Service manually.
- You do still need to set environment variables, choose the Render plan, confirm the health check path, and generate a public domain.

## 3. Later post-migration code work that is not required for the first hosted tag

These are not human tasks. They stay listed here so the first-tag scope is explicit and the repo is not oversold:
- Neon schema and migrations
- Better Auth server configuration and mounted auth routes
- SMTP-backed email delivery for magic links and verification
- Final API key system wiring against Better Auth
- Final session persistence, rehydration, upgrade, and limits logic on the new stack
- Final integration test suite for the migrated system

Concrete examples of current placeholders:
- [lib/auth/service.ts](/home/gamp/Flowfex/lib/auth/service.ts:1) still returns placeholder auth state and throws "Authentication is not configured yet"
- [frontend/src/services/authService.js](/home/gamp/Flowfex/frontend/src/services/authService.js:1) still throws placeholder auth errors
- [backend/src/session/sessionDataAccess.js](/home/gamp/Flowfex/backend/src/session/sessionDataAccess.js:1) still returns `false` for session-data configuration and throws if used

What this means operationally:
- The first hosted Flowfex tag can be completed now without those pieces
- The full Neon + Better Auth production rollout still cannot be completed until the connection string is provided and the remaining migration work is implemented

## 4. Configure Neon and Better Auth

Create the Neon project, collect the Postgres connection string, and prepare the Better Auth secret plus provider credentials.

Important:
- This section is for the later Neon + Better Auth rollout.
- It is not required for the first taggable hosted version if you are shipping the current pre-auth Flowfex state.
- For the first tag, focus on frontend + backend hosting, origin config, one LLM provider key, and Render/Vercel wiring.

Current human-provided values that are already known to be required from the codebase:
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `VITE_APP_URL`
- `VITE_BACKEND_URL`
- `FLOWFEX_PUBLIC_ORIGIN`
- `ALLOWED_ORIGINS`
- `FLOWFEX_LINK_SECRET`
- One LLM provider key: `GROQ_API_KEY` or `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- SMTP values if you want magic links or email verification:
  - `EMAIL_FROM`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
- OAuth provider values for every provider you actually enable:
  - Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Twitter/X: `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`
  - Discord: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
  - Microsoft: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
  - Apple: `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`

## 5. Apply the database schema

The Neon schema and migration steps will be regenerated during the active migration.

## 6. Configure authentication

The app supports:
- Email/password sign-up and sign-in
- Google OAuth
- GitHub OAuth
- Twitter/X OAuth
- Discord OAuth
- Microsoft OAuth
- Apple OAuth
- Anonymous session creation before sign-in

### Required Auth settings

Set Better Auth values for your real frontend and backend:
- Site URL: `https://app.yourdomain.com`
- Redirect URLs:
  - `https://app.yourdomain.com/dashboard`
  - `http://localhost:3000/dashboard`
  - Any preview/staging frontend URLs you actually use

Why this matters:
- `lib/auth/service.ts` sends sign-up and OAuth redirects to `/dashboard`
- If these URLs are missing in the auth provider configuration, sign-in and sign-up redirects will fail

### Email/password

If you want email sign-up:
- Enable the email provider in your Better Auth setup
- Decide whether email confirmation is required
- Configure your email sender and SMTP provider
- Test:
  - sign up
  - email confirmation
  - post-confirmation redirect to `/dashboard`

### Google OAuth

If you want Google sign-in:
- Create a Google OAuth app in Google Cloud
- Add the callback URL exposed by your Better Auth backend
- Store the Google client ID and secret in backend environment variables
- Test sign-in end to end

### GitHub OAuth

If you want GitHub sign-in:
- Create a GitHub OAuth app
- Add the callback URL exposed by your Better Auth backend
- Store the GitHub client ID and secret in backend environment variables
- Test sign-in end to end

If you do not plan to support Google or GitHub at launch, disable those buttons in product planning or leave the providers disabled and accept that those buttons will fail until configured.

### Other OAuth providers

If you enable any of these, you must create the provider app, configure the callback URL exposed by the Better Auth backend, and set the backend env vars:
- Twitter/X
- Discord
- Microsoft
- Apple

If you do not enable them at launch, leave their env vars unset and do not expose those sign-in paths in production UX.

## 7. Set production environment variables

The repo-level source of truth is:
- [.env.example](/home/gamp/Flowfex/.env.example:1)

Important implementation detail:
- The backend loads `.env` from repo root and `backend/.env` if present
- The frontend is built with Vite, so public env vars must be present in the frontend build environment
- Vite is configured to expose `VITE_*` variables

### First tag minimum variables

These are the values you need for the first hosted Flowfex version that matches the repo today:

| Variable | Where to set it | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_APP_URL` | Frontend build env | Yes | Public app origin |
| `VITE_BACKEND_URL` | Frontend build env | Yes | Backend base URL used by the frontend |
| `FLOWFEX_PUBLIC_ORIGIN` | Backend runtime | Yes | Public backend origin used when generating connect links |
| `ALLOWED_ORIGINS` | Backend runtime | Yes | Comma-separated frontend origins allowed by CORS and Socket.io |
| `FLOWFEX_LINK_SECRET` | Backend runtime | Yes | Stable secret for connect-link generation |
| `OPENAI_API_KEY` or `GROQ_API_KEY` or `ANTHROPIC_API_KEY` | Backend runtime | Yes for real orchestration | Enables real tool/LLM execution instead of mock mode |

For local-only development:

| Variable | Where to set it | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | Local backend env | Optional | Local backend listening port. Default behavior is `4000`. Do not set this manually on Render. |

### Later migration variables

These are not required for the first tag unless you complete the remaining Neon + Better Auth migration work:

| Variable | Where to set it | Required | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Backend only | Required after migration | Direct DB access / migration tooling |
| `BETTER_AUTH_SECRET` | Backend only | Required after migration | Better Auth signing and encryption secret |
| `BETTER_AUTH_URL` | Backend only | Required after migration | Public base URL used by the auth handler |
| `EMAIL_FROM` | Backend only | Required for email auth flows | Sender address for magic links and verification mail |
| `SMTP_HOST` | Backend only | Required for email auth flows | SMTP host |
| `SMTP_PORT` | Backend only | Required for email auth flows | SMTP port |
| `SMTP_USER` | Backend only | Required for email auth flows | SMTP username |
| `SMTP_PASS` | Backend only | Required for email auth flows | SMTP password |

### Strongly recommended variables

| Variable | Required level | Purpose |
| --- | --- | --- |
| `FLOWFEX_CONNECTION_API_KEY` | Optional hardening | Shared server-level connection secret for unauthenticated API connections |
| OAuth provider client IDs and secrets | Required only for providers you enable | Enables social sign-in for the matching provider |

### LLM provider note

The backend currently resolves provider priority in this order:
1. `GROQ_API_KEY`
2. `OPENAI_API_KEY`
3. `ANTHROPIC_API_KEY`

So do one of these:
- Set only the provider you actually want to use
- Or be aware that if multiple keys are set, Groq wins first

## 8. Deploy the frontend

You must choose one of these Vercel modes:

1. Root directory = repo root `.`
   Uses `/vercel.json`

2. Root directory = `frontend`
   Uses `/frontend/vercel.json`

Why this matters:
- The frontend source lives in `/frontend`
- The repo already includes SPA rewrite rules
- A Vercel 404 on refresh usually means the wrong root directory was selected or the project was not redeployed after the rewrite config changed

Before you ship:
- Set frontend build env vars in Vercel
- Set `VITE_BACKEND_URL` to the real Render backend URL
- Confirm the selected Vercel root directory matches the `vercel.json` you intend to use
- Confirm SPA rewrites work
- Verify these routes on refresh:
  - `/`
  - `/signin`
  - `/signup`
  - `/dashboard`
  - `/canvas`
  - `/settings`

Important:
- Every change to `VITE_*` values requires a redeploy of the frontend
- A frontend-only Vercel deployment is not enough for Flowfex; the app still needs the separately hosted Render backend for API and Socket.io connectivity

## 9. Deploy the backend on Render

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
- Create a Render Web Service for this repo
- Preferred: import [render.yaml](/home/gamp/Flowfex/render.yaml:1)
- Manual fallback: connect the repo in Render and set the service root directory to `/backend`
- Set the Render build command to `npm ci`
- Set the Render start command to `npm start`
- Set all backend env vars
- Configure the Render health check path as `/health`
- Serve HTTPS in production
- Make sure WebSocket / Socket.io traffic is allowed
- Set `FLOWFEX_PUBLIC_ORIGIN` to the real public backend URL
- Set `ALLOWED_ORIGINS` to the real frontend origin list

Only set a custom start command if Render fails to auto-detect it.
Expected command:
```bash
npm start
```

Only set a custom port if Render fails to detect the app correctly.
Expected runtime behavior in code:
- Render injects `PORT`
- Flowfex listens on that `PORT`
- Flowfex serves `GET /health` with HTTP 200

Example:
```env
FLOWFEX_PUBLIC_ORIGIN=https://api.yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com,https://staging-app.yourdomain.com
```

Recommended Render plan choice:
- `Free` for testing or preview use only
- `Starter` or higher for launch

Important Render caveats for this repo:
- Render Free spins down after 15 minutes without inbound traffic
- Render Free uses an ephemeral filesystem
- Render Free cannot attach a persistent disk
- Render Free blocks outbound SMTP traffic on ports `25`, `465`, and `587`
- This repo currently falls back to file-backed session state until the Neon migration is finished, so do not rely on Render Free for durable session state in production

## 9A. Scope the first tag honestly

What the first hosted Flowfex tag can honestly support today:
- Vercel-hosted frontend
- Render-hosted backend
- Backend health check at `/health`
- Socket.io namespaces and control API
- Prompt, Link, SDK, and Live connection bootstrap through `/connect`
- One configured LLM provider
- Manual agent attach flows against the current backend

What the first hosted Flowfex tag should not promise yet:
- Better Auth sign-in/sign-up
- Email verification or magic links
- OAuth sign-in providers
- Database-backed anonymous session creation
- API key management UI as a production-ready feature
- Final Neon-backed session persistence and recovery

If you tag the repo before the migration is finished, treat auth, API keys, and Neon-backed sessions as explicitly out of scope for that tag.

## 10. DNS and TLS

You need to complete the non-code hosting work:
- Point the frontend domain to Vercel
- Point the backend domain to Render
- Wait for TLS certificates to be valid
- Verify:
  - `https://app.yourdomain.com`
  - `https://api.yourdomain.com`

Do not launch with mixed origins like:
- frontend on HTTPS
- backend on plain HTTP

That will break secure browser behavior and WebSocket expectations.

## 11. Generate your first Flowfex API key

This is required if you want clean production use of SDK or live-channel connections without relying on an active signed-in browser session.

This section applies only after the Better Auth + Neon migration is completed.

How to do it:
1. Launch the app with the database and auth providers configured
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

## 12. Understand connection security in production

Current behavior:
- Prompt and link connections can work without a user API key
- SDK and live-channel connections require either:
  - a valid Flowfex API key, or
  - a valid authenticated user context

This rule is enforced in:
- [backend/src/server/FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:332)

Optional extra hardening:
- Set `FLOWFEX_CONNECTION_API_KEY`
- Use it for server-to-server or restricted external connection flows

## 13. Review the current skill-ingestion issues

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

## 14. Validate anonymous and authenticated session behavior

This app supports anonymous-first onboarding and later upgrade into an authenticated user.

This section applies only after the Better Auth + Neon migration is completed.

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

## 15. Run the production verification commands yourself

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

### First tag verification checklist

Before creating the first hosted tag, verify at least these behaviors with the real deployed URLs:
- `GET /health` returns HTTP 200 from the Render backend
- The Vercel frontend points to the Render backend via `VITE_BACKEND_URL`
- The landing page loads
- `/dashboard` loads without a hard crash
- The Connect Agent modal opens
- Prompt bootstrap works
- Link bootstrap works
- SDK bootstrap works
- Live Channel bootstrap works
- Socket.io namespaces accept connections from the frontend origin
- One LLM provider key is present and the backend is not running in mock mode

## 16. Manual acceptance checklist before launch

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

This entire section applies only after the Better Auth + Neon migration is completed.
- Email sign-up works
- Email confirmation works
- Email sign-in works
- Google sign-in works if enabled
- GitHub sign-in works if enabled
- Sign-out works

### Sessions

These checks apply only after the database-backed session migration is completed.
- Anonymous session creation works
- Anonymous session validation works
- Anonymous-to-authenticated upgrade works
- Recent authenticated session restore works

### API key management

This section applies only after the Better Auth + Neon migration is completed.
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

## 17. Secret-handling rules you need to enforce operationally

Do this:
- Keep backend-only secrets out of the frontend bundle
- Keep raw API keys in a secret manager
- Rotate leaked keys immediately
- Set `FLOWFEX_LINK_SECRET` explicitly in production
- Keep production and staging secrets separate

Do not do this:
- Put backend-only secrets in frontend env
- Commit real secrets into `.env`
- Reuse a dev OAuth app in production
- Reuse the same API key across team members without ownership tracking

## 18. What is already done in code, so you do not need to repeat it manually

You do not need to manually implement:
- SPA rewrite config files for Vercel
- basic Render-compatible backend binding, port handling, and health checks
- Backend connection routes
- Frontend build pipeline
- Backend build script
- package installation and initial Supabase removal for the Neon + Better Auth migration

You do still need the remaining code migration to be finished before auth, API keys, Neon-backed sessions, and Better Auth flows are truly production-ready.

You only need to supply the infrastructure, secrets, provider setup, and final operator verification after that remaining code migration is complete.

## 19. Final recommended order of operations

Follow this order:

1. Fill the first-tag env vars from [.env.example](/home/gamp/Flowfex/.env.example:1)
2. Deploy backend on Render
3. Deploy frontend on Vercel
4. Verify CORS and real backend connectivity
5. Test Prompt, Link, SDK, and Live Channel attach flows
6. Review blocked and duplicate skills
7. Run the first tag verification checklist
8. Create the tag
9. After that, create the Neon project
10. Paste the Neon connection string into `DATABASE_URL`
11. Reply `continue` so the remaining migration code can be implemented
12. After the code migration is complete, apply the generated database migration
13. Configure auth providers and redirect URLs
14. Generate your first Flowfex API key
15. Run the full post-migration acceptance checklist

If you complete every item in this file, you will have covered the production tasks that still require human action outside the code.
