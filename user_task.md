# Flowfex Remaining Human Tasks

Only keep the items here that still need provider dashboards, billing, or production account access.

## Production Env Still Needed
- **Vercel frontend env:** confirm `VITE_APP_URL=https://flowfex.vercel.app` and `VITE_BACKEND_URL=https://flowfex.onrender.com` are set on the Vercel project.
- **Render backend env correction:** confirm `FLOWFEX_PUBLIC_ORIGIN=https://flowfex.onrender.com` (backend origin, not the Vercel frontend).
- **Render backend env addition:** confirm `FLOWFEX_APP_URL=https://flowfex.vercel.app` so cross-site auth cookies and trusted-origin checks resolve the real frontend origin cleanly.
- **Render email env (optional):** add `EMAIL_REPLY_TO` for branded support replies if you want a custom reply-to address.

## OAuth Provider Dashboards
- **Google OAuth:** in Google Cloud, set the authorized JavaScript origin to `https://flowfex.vercel.app` and the authorized redirect URI to `https://flowfex.onrender.com/api/auth/callback/google`.
- **GitHub OAuth:** in GitHub OAuth Apps, set the homepage URL to `https://flowfex.vercel.app` and the authorization callback URL to `https://flowfex.onrender.com/api/auth/callback/github`.

## Email Provider (Resend)
- Resend is wired and forgot-password works through the shared sender. To brand the email, verify your own domain in Resend and set `EMAIL_FROM` to that verified address.

## Billing (deferred per request)
- **Payment integration:** the authenticated payment gate is in place and shows the upgrade card with `Upgrade Plan` / `Wait for Reset`. Hook the real billing provider (Stripe checkout + webhook) when you are ready to charge.

## Infrastructure
- **Database backups:** enable managed backups on the Neon/Postgres production database.
- **Render plan:** move the backend off the free tier before launch so onboarding, live attach checks, and auth callbacks do not stall on cold starts.

## Final Human Smoke Tests
- **OAuth + email smoke test:** with the provider dashboards updated, verify email sign-up, email sign-in, Google sign-in, GitHub sign-in, forgot-password request, and reset completion on the live site.
- **Cross-laptop attach smoke test:** open the site on a fresh browser/laptop and confirm the dashboard now stays gated until a real agent attach is verified (no ghost dashboard, no false token-expired message).
- **Billing smoke test (when payment is wired):** verify the authenticated payment gate opens with real checkout and clears correctly after a successful payment.
