# Syniq production operator checklist

Human-only work in **external** consoles (hosting dashboards, DNS, OAuth vendors, email providers, payment providers, and live browsers). Nothing here is done by editing the application repository.

If the default Syniq stack is already live (Render Web Service + Vercel frontend + Neon + Resend + Google/GitHub OAuth), treat most environment items as **confirm values, rotate after incidents, and keep provider consoles in sync**—not as greenfield setup.

---

## 1. Hosting and deployment accounts

- [ ] Confirm the **Vercel** team and project that own the production frontend.
- [ ] Confirm the **Render** team and Web Service that own the production backend API and WebSocket host.
- [ ] Confirm the **Neon** (or other Postgres) organization and production database branch that receive live traffic.
- [ ] Confirm the **Resend** account that owns production sending domains and API keys.
- [ ] Confirm the **Google Cloud** project used for the production Google OAuth client.
- [ ] Confirm the **GitHub** organization or user that owns the production GitHub OAuth App.
- [ ] When billing is enabled, confirm the **Stripe** account, business profile, and tax settings used for Syniq charges.
- [ ] In each host’s billing UI (**Render**, **Vercel**, **Neon**), choose paid or reserved capacity so cold starts and connection limits match launch expectations.

---

## 2. Environment variables and secrets

### Render (backend Web Service)

- [ ] Open the service **Environment** tab and confirm every required secret is present for production (no placeholder text, no accidental dev values).
- [ ] Confirm `DATABASE_URL` matches the **pooled** connection string for the production Neon branch you intend to serve traffic.
- [ ] Confirm `BETTER_AUTH_SECRET` and `JWT_SECRET` are long random values appropriate for production (rotate both together if either may have leaked).
- [ ] Confirm `BETTER_AUTH_URL` and `SYNIQ_PUBLIC_ORIGIN` match the **public HTTPS origin** of this Render service.
- [ ] Confirm `SYNIQ_APP_URL` matches the **public HTTPS origin** of the Vercel frontend (used for cookies and trusted browser origins).
- [ ] Confirm `ALLOWED_ORIGINS` lists every browser origin that must call the API (production frontend, public backend origin if browsers hit it, staging hosts if used)—comma-separated, no spaces unless intentional.
- [ ] Confirm `SYNIQ_LINK_SECRET` is set to a strong random value used only for signing attach links.
- [ ] Optionally set `SYNIQ_CONNECTION_API_KEY` if you require a shared key for SDK or anonymous attach traffic; leave unset only if that policy is intentional.
- [ ] Confirm `RESEND_API_KEY`, `EMAIL_FROM`, and optional `EMAIL_REPLY_TO` match the verified sender configuration in Resend.
- [ ] Confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET` match the live OAuth apps in Google Cloud and GitHub.
- [ ] Confirm `GROQ_API_KEY` (or whichever LLM vendor keys the deployment uses) is present if orchestration calls hosted models from this service.
- [ ] Confirm `NODE_ENV` is `production` for the live service.
- [ ] After any change, trigger a **manual redeploy** on Render so new variables load.

### Vercel (frontend project)

- [ ] In **Project → Settings → Environment Variables**, confirm `VITE_APP_URL` is the canonical public frontend URL.
- [ ] Confirm `VITE_BACKEND_URL` is the canonical public backend URL (Render HTTPS origin).
- [ ] Trigger a **production redeploy** after changing `VITE_*` values so the bundle is rebuilt.

### Stripe (when billing is on)

- [ ] In the Stripe Dashboard, create or confirm **live** API keys and webhook signing secrets, then copy `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and catalog price IDs into Render exactly as the billing integration expects.
- [ ] Move from test mode to live mode only after a successful test-mode checkout in Stripe’s own UI.

---

## 3. Database and persistence provider setup

- [ ] In **Neon**, confirm the production database (or branch) name, region, and role used in `DATABASE_URL`.
- [ ] Enable and verify **automated backups** and retention for the production branch.
- [ ] Restrict Neon console access and database roles to the operators who require it.
- [ ] If you use IP allowlists or network rules, add Render’s egress behavior (or disable strict IP rules if Render uses dynamic egress and Neon must stay reachable).

---

## 4. Auth provider setup

- [ ] In **Google Cloud Console**, finish the OAuth consent screen for external or internal users as appropriate, including support email, app home link, and privacy policy URL fields Google displays to users.
- [ ] In **GitHub → Settings → Developer settings → OAuth Apps**, confirm the production app’s homepage and callback URLs still match the deployed hosts.
- [ ] After any auth-related secret rotation, **redeploy Render** and **redeploy Vercel** so sessions and builds pick up the new configuration.

---

## 5. DNS and domain configuration

- [ ] Decide the long-term **apex and API hostnames** (for example `syniq.app` and `api.syniq.app`).
- [ ] At your DNS provider, create the **CNAME / A / ALIAS** records Vercel shows for the frontend custom domain; wait until Vercel marks the domain as verified and SSL is active.
- [ ] Create the DNS records Render shows for a **custom backend hostname** if the API should not stay on the default `onrender.com` name.
- [ ] Add the **Resend** DNS records (SPF, DKIM, optional DMARC) for the domain you send mail from; wait until Resend shows the domain as verified.
- [ ] When cutover completes, manually update **every** dependent URL: Render env (`BETTER_AUTH_URL`, `SYNIQ_PUBLIC_ORIGIN`, `SYNIQ_APP_URL`, `ALLOWED_ORIGINS`), Vercel env (`VITE_APP_URL`, `VITE_BACKEND_URL`), Google **Authorized JavaScript origins** and **redirect URIs**, GitHub **Authorization callback URL**, and any marketing links—then redeploy both hosts.

---

## 6. SMTP / email provider setup (Resend)

- [ ] Verify the production sending domain in Resend and resolve any DNS or reputation warnings shown in the Resend UI.
- [ ] Create or rotate the production **API key** in Resend and paste it into Render as `RESEND_API_KEY`.
- [ ] Set `EMAIL_FROM` in Render to an address on the verified domain (not a sandbox-only address) before launch mail goes to real users.
- [ ] From a normal mailbox, confirm a real **password reset** email arrives and renders correctly after DNS and keys are live.

---

## 7. OAuth provider configuration

### Google

- [ ] In **APIs & Services → Credentials**, open the production **OAuth 2.0 Web client**.
- [ ] Under **Authorized JavaScript origins**, list the exact HTTPS frontend origin(s) users see in the browser.
- [ ] Under **Authorized redirect URIs**, list the backend callback URL Better Auth uses (for example `https://<api-host>/api/auth/callback/google`).
- [ ] Copy any rotated **Client ID** and **Client secret** into Render and redeploy.

### GitHub

- [ ] In the production **OAuth App**, set **Homepage URL** to the public marketing or app URL users recognize.
- [ ] Set **Authorization callback URL** to the backend GitHub callback route Better Auth exposes.
- [ ] Copy rotated credentials into Render and redeploy.

---

## 8. Production verification and launch checks

Run these in a **clean browser profile** (or separate device) against the live URLs.

- [ ] Anonymous visit: complete onboarding attach, confirm the dashboard only opens after a **verified** agent connection, and confirm anonymous **usage limits** behave as documented before the sign-up gate.
- [ ] Email **sign-up** and **sign-in** with a disposable domain you control; confirm the session persists across refresh.
- [ ] **Forgot password**: request a link, consume it, set a new password, sign in with the new password.
- [ ] **Google** and **GitHub** sign-in each complete end-to-end and return to the authenticated dashboard.
- [ ] Cross-device attach: on hardware that has never used Syniq, confirm `/dashboard` stays gated until a real attach succeeds.
- [ ] Authenticated **quota exhaustion**: confirm the upgrade / wait messaging matches the intended commercial state (billing on vs daily reset only).
- [ ] **API keys** (if exposed in Settings): create, use with the SDK once, revoke, and confirm revoked keys are rejected.
- [ ] **WebSocket / live orchestration**: leave the dashboard open through a long session and confirm reconnect behavior after putting the laptop to sleep or toggling networks.

---

## 9. Manual approval and review steps

- [ ] Legal / product review of OAuth consent screen text, logos, and linked privacy policy URLs shown by Google and GitHub.
- [ ] Security review of who has access to Render, Vercel, Neon, Resend, Stripe, DNS, and Google Cloud IAM.
- [ ] If Google marks the app “Testing”, decide whether to **submit for verification** before allowing broad Google accounts.
- [ ] Executive or PM sign-off on **go-live** after the checks in section 8 pass on production infrastructure.

---

Repository work belongs in code reviews and deployments automated from git—not in this file.
