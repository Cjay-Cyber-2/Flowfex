# Flowfex Operator Checklist

Human-only tasks that must be completed in external dashboards, provider consoles, and production accounts. Nothing in this file can be done from inside the repository — those are already implemented.

Work through each section in order before announcing the launch.

---

## 1. Hosting and deployment accounts

- [ ] Create or confirm a **Vercel** account that owns the `flowfex` frontend project.
- [ ] Create or confirm a **Render** account that owns the `flowfex` backend Web Service.
- [ ] Create or confirm a **Neon** (or equivalent Postgres) account that owns the production database.
- [ ] Create or confirm a **Resend** account that will send Flowfex transactional email.
- [ ] Create or confirm a **Google Cloud** project for the Google OAuth client.
- [ ] Create or confirm a **GitHub Developer Settings** OAuth App for the GitHub login.
- [ ] (When ready to charge) create or confirm a **Stripe** account that will own the Flowfex billing products.

## 2. Database and persistence provider setup

- [ ] In **Neon**, create the `flowfex_production` database (or equivalent).
- [ ] Copy the **pooled connection string** from the Neon dashboard.
- [ ] In **Neon**, enable managed daily backups on the production database.
- [ ] In **Neon**, restrict access to the production branch to the operators that need it.

## 3. Environment variables and secrets

Set the following on the right hosts. Never commit these values.

### 3.1 Render — backend service environment

- [ ] `DATABASE_URL` — the pooled Neon connection string from §2.
- [ ] `BETTER_AUTH_SECRET` — a long random secret (at least 32 bytes).
- [ ] `JWT_SECRET` — same value as `BETTER_AUTH_SECRET` (used for the SDK token verification).
- [ ] `BETTER_AUTH_URL` — `https://flowfex.onrender.com` (backend origin).
- [ ] `FLOWFEX_PUBLIC_ORIGIN` — `https://flowfex.onrender.com` (backend origin, not the frontend).
- [ ] `FLOWFEX_APP_URL` — `https://flowfex.vercel.app` (frontend origin used for cross-site auth cookies and trusted origins).
- [ ] `ALLOWED_ORIGINS` — include both the production frontend and backend origins that serve browser traffic, e.g. `https://flowfex.vercel.app,https://flowfex.onrender.com` (comma-separated; add any staging origins you use).
- [ ] `RESEND_API_KEY` — the Resend production API key.
- [ ] `EMAIL_FROM` — the verified Resend sender address (e.g. `Flowfex <noreply@flowfex.app>`).
- [ ] `EMAIL_REPLY_TO` — (optional) a support reply-to address.
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — from the Google Cloud OAuth client (§7).
- [ ] `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` — from the GitHub OAuth App (§7).
- [ ] `FLOWFEX_LINK_SECRET` — a long random secret used to sign one-time attach links.
- [ ] `FLOWFEX_CONNECTION_API_KEY` — (optional) shared API key required for non-authenticated SDK / live attaches. Leave unset to allow authenticated and anonymous attaches without an extra key.
- [ ] `NODE_ENV` — `production`.

### 3.2 Vercel — frontend project environment

- [ ] `VITE_APP_URL` — `https://flowfex.vercel.app`.
- [ ] `VITE_BACKEND_URL` — `https://flowfex.onrender.com`.

### 3.3 (When ready) Stripe environment on Render

- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the price IDs for the Flowfex paid plans.

## 4. Auth provider setup

- [ ] In **Render**, redeploy the backend after every secret change so Better Auth picks up the new values.
- [ ] In **Vercel**, redeploy the frontend after changing `VITE_*` values so the build embeds the right origins.

## 5. OAuth provider configuration

### 5.1 Google OAuth (Google Cloud Console)

- [ ] Configure the OAuth consent screen for the Flowfex production project.
- [ ] Create an OAuth 2.0 Client ID of type **Web application**.
- [ ] Add **Authorized JavaScript origins**: `https://flowfex.vercel.app`.
- [ ] Add **Authorized redirect URIs**: `https://flowfex.onrender.com/api/auth/callback/google`.
- [ ] Copy the resulting Client ID and Client Secret into Render as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (§3.1).

### 5.2 GitHub OAuth (GitHub Developer Settings → OAuth Apps)

- [ ] Create the Flowfex production OAuth App.
- [ ] Set **Homepage URL**: `https://flowfex.vercel.app`.
- [ ] Set **Authorization callback URL**: `https://flowfex.onrender.com/api/auth/callback/github`.
- [ ] Copy the resulting Client ID and Client Secret into Render as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (§3.1).

## 6. SMTP / email provider setup (Resend)

- [ ] In **Resend**, verify the production sending domain (DNS records added in §7).
- [ ] In **Resend**, create a production API key and store it as `RESEND_API_KEY` on Render (§3.1).
- [ ] Set `EMAIL_FROM` on Render to the verified branded address (§3.1).
- [ ] Send one test password-reset email from the Flowfex sign-in page and confirm delivery.

## 7. DNS and domain configuration

- [ ] Decide on the production domain (e.g. `flowfex.app`).
- [ ] In your DNS host, add the **Vercel** records for the frontend domain (Vercel will display the exact CNAME / A records once you add the domain to the project).
- [ ] In your DNS host, add the **Render** records for the backend custom subdomain (e.g. `api.flowfex.app`).
- [ ] In your DNS host, add the **Resend** sending records (SPF, DKIM, optional DMARC) shown in the Resend domain page.
- [ ] Wait for SSL/TLS to provision on Vercel and Render (both auto-issue certificates) and confirm `https://` works for each domain.
- [ ] After moving to a custom domain, update `BETTER_AUTH_URL`, `FLOWFEX_PUBLIC_ORIGIN`, `FLOWFEX_APP_URL`, `ALLOWED_ORIGINS`, `VITE_APP_URL`, `VITE_BACKEND_URL`, the OAuth redirect URIs, and the Resend `EMAIL_FROM` to match.

## 8. Hosting plan and capacity decisions

- [ ] In **Render**, move the backend off the free tier before launch so onboarding, live attach checks, and auth callbacks do not stall on cold starts.
- [ ] In **Vercel**, confirm the project is on a plan that allows the production traffic and analytics you expect.
- [ ] In **Neon**, confirm the compute size and storage tier match expected production load.

## 9. Production verification and launch checks

Run each of these manually against the live site after every secret/dashboard change.

- [ ] **Anonymous flow:** open the site on a fresh browser, complete the prompt connection, confirm the agent really attaches before the dashboard opens, and confirm the daily 5-request quota is enforced before the sign-up wall appears.
- [ ] **Email sign-up:** create an account from the sign-up page and confirm the dashboard remains accessible after authentication.
- [ ] **Email sign-in:** sign in with the same account from a separate browser and confirm the session resumes.
- [ ] **Forgot password:** request a reset, click the email link, set a new password, and sign in with it.
- [ ] **Google sign-in:** complete the Google OAuth round-trip and land on the dashboard.
- [ ] **GitHub sign-in:** complete the GitHub OAuth round-trip and land on the dashboard.
- [ ] **Cross-laptop attach test:** open the site on a colleague's laptop with no previous Flowfex history; confirm `/dashboard` redirects to `/onboarding` until a real agent attaches.
- [ ] **Stale session / shared prompt:** paste a connection prompt that references an older session id into a fresh agent; confirm the first attach is not rejected solely because the session row is old (anonymous duration is measured from verified attach, not session creation time).
- [ ] **Authenticated request quota:** sign in, exhaust the daily request allowance, and confirm the upgrade card appears (no signup buttons).
- [ ] **API key issuance:** in Settings → API Keys, generate a key while signed in, run an SDK attach with it, and revoke the key.

## 10. Manual approval and review steps

- [ ] Review the production OAuth consent screen wording (Google and GitHub) to make sure the displayed app name, logo, and privacy policy URL are correct.
- [ ] Review the Resend domain reputation and warm-up status before announcing the product.
- [ ] (Optional) Submit the Google OAuth consent screen for verification if you plan to allow external Google accounts beyond your test users.

## 11. Billing (only when you are ready to charge)

- [ ] In **Stripe**, create the Flowfex Pro and Teams products and prices.
- [ ] In **Stripe**, create a webhook endpoint pointing at the backend billing webhook route on Render.
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the price IDs to Render (§3.3).
- [ ] Run a live test charge in Stripe test mode, confirm the upgrade card on `/dashboard` clears, and confirm the user moves to the paid tier.
- [ ] Switch Stripe to live mode for production after the test charge succeeds.

---

> Anything not listed in this file is already implemented in the repository. If you find yourself needing to write code, that work belongs in the codebase, not in this checklist.
