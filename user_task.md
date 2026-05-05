# Flowfex Remaining Human Tasks

Only keep the items here that still need provider dashboards, billing, or production account access.

## Production Env Still Needed
- **Vercel frontend env:** add `VITE_APP_URL=https://flowfex.vercel.app` and `VITE_BACKEND_URL=https://flowfex.onrender.com`.
- **Render backend env correction:** change `FLOWFEX_PUBLIC_ORIGIN` to `https://flowfex.onrender.com` because it must point to the backend API origin, not the Vercel frontend.
- **Render backend env addition:** add `FLOWFEX_APP_URL=https://flowfex.vercel.app` so cross-site auth cookies and trusted-origin checks resolve the real frontend origin cleanly.
- **Render email env (optional but recommended):** add `EMAIL_REPLY_TO` for branded support replies.

## OAuth Provider Dashboards
- **Google OAuth:** in Google Cloud, set the authorized JavaScript origin to `https://flowfex.vercel.app` and the authorized redirect URI to `https://flowfex.onrender.com/api/auth/callback/google`.
- **GitHub OAuth:** in GitHub OAuth Apps, set the homepage URL to `https://flowfex.vercel.app` and the authorization callback URL to `https://flowfex.onrender.com/api/auth/callback/github`.

## Email Provider
- **Resend branded sender:** if you want production-branded forgot-password email instead of the shared `resend.dev` sender, verify your own domain and move `EMAIL_FROM` to that verified domain.

## Billing
- **Payment integration:** connect the real billing provider and webhook flow. The authenticated dashboard gate is in place, but real checkout and entitlement activation are still not wired.

## Infrastructure
- **Database backups:** enable managed backups on the Neon/Postgres production database.
- **Render plan:** move the backend off the free tier before launch so onboarding, live attach checks, and auth callbacks do not stall on cold starts.

## Final Human Smoke Tests
- **OAuth + email smoke test:** with the provider dashboards updated, verify email sign-up, email sign-in, Google sign-in, GitHub sign-in, forgot-password request, and reset completion on the live site.
- **Billing smoke test:** after payment is integrated, verify the authenticated payment gate opens with the real checkout flow and clears correctly after a successful payment.
