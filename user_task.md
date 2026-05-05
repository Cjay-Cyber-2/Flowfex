# Flowfex Remaining Human Tasks

Only keep provider, billing, and production-account work here. Code tasks have been handled separately.

## Billing
- **Payment Integration:** Connect the real billing provider and webhook flow. The authenticated dashboard now shows the payment gate, but actual checkout and entitlement activation are still manual.

## Production Secrets & Environment
- **Frontend Env (Vercel):** Set `VITE_APP_URL` and `VITE_BACKEND_URL` to the live frontend and backend URLs.
- **Backend Env (Render):** Set `DATABASE_URL`, `FLOWFEX_PUBLIC_ORIGIN`, `ALLOWED_ORIGINS`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `JWT_SECRET`, and `FLOWFEX_LINK_SECRET`.
- **Resend Env (Render):** Set `RESEND_API_KEY`, `EMAIL_FROM`, and optionally `EMAIL_REPLY_TO` so forgot-password emails send for real users.
- **Model Keys (Render):** Set the LLM provider keys you want Flowfex to use in production (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and/or `GROQ_API_KEY`).

## OAuth Provider Dashboards
- **Google OAuth:** Add the live frontend origin and Better Auth callback URLs, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render.
- **GitHub OAuth:** Add the live frontend origin and Better Auth callback URLs, then set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in Render.

## Email Domain
- **Resend Domain Verification:** Verify the sender domain in Resend and publish the SPF, DKIM, and DMARC DNS records required for `EMAIL_FROM`.

## Infrastructure
- **Database Backups:** Enable managed backups on the production Postgres instance.
- **Hosting Plans:** Move Render off the free tier before production so agent connections and onboarding do not stall on cold starts.

## Final Production Checks
- **Database-Backed Verification:** Re-run the auth/session and limits integration tests in an environment where `DATABASE_URL` is available.
- **Live Smoke Test:** In production, verify all four auth paths end to end: email sign-up, email sign-in, Google sign-in, GitHub sign-in, and forgot-password.
- **Connection Smoke Test:** Verify a real agent attach in each connection mode you plan to expose, confirm the onboarding animation waits for the verified attach, and confirm the dashboard opens only after backend confirmation.
