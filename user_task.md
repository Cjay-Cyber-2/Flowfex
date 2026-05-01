# Flowfex Human Operator Checklist

Use this file only for work that must be done by a person in external dashboards, provider consoles, DNS settings, or secret managers.

## Hosting and Deployment Accounts

- In Vercel, create or confirm the production frontend project and connect the correct repository and root directory.
- In Render, create or confirm the production backend web service and connect the correct repository.
- Approve the production plans for Vercel and Render.
- In Render, confirm the service allows HTTPS and WebSocket traffic.
- In Render, set the production health check path to `/health`.

## Environment Variables and Secrets

- Generate and store `FLOWFEX_LINK_SECRET` in the approved secret manager.
- Generate and store `BETTER_AUTH_SECRET` in the approved secret manager.
- In Vercel, set `VITE_APP_URL` and `VITE_BACKEND_URL`.
- In Render, set `FLOWFEX_PUBLIC_ORIGIN`, `ALLOWED_ORIGINS`, `FLOWFEX_LINK_SECRET`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- In Render, set the approved production LLM key: `GROQ_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`.
- Set `FLOWFEX_CONNECTION_API_KEY` only if private server-to-server connection flows are approved.
- Keep preview, staging, and production secrets separate.
- Rotate any secret that was exposed in chat, logs, screenshots, commits, or the wrong dashboard.

## Database and Persistence Provider Setup

- Create the production Postgres database in the approved provider.
- Approve the production database region and plan.
- Copy the production `DATABASE_URL` from the database provider dashboard.
- Set `DATABASE_URL` in the backend production environment only.
- Enable backups and confirm restore access in the database provider dashboard.
- Confirm the backend host is allowed to connect to the production database.

## Auth Provider Setup

- Confirm the production frontend URL is allowed by the auth provider.
- Confirm the production redirect URLs are allowed by the auth provider.
- Decide whether production sign-in requires email verification.
- Confirm the production session, sign-out, and account-recovery policy in the auth provider dashboard.

## DNS and Domain Configuration

- Choose the production frontend domain.
- Choose the production backend domain.
- Add the required frontend and backend DNS records in the DNS provider dashboard.
- Complete domain verification in Vercel and Render.
- Wait for DNS propagation and confirm valid TLS certificates are active.
- Confirm both production domains load over HTTPS.

## SMTP/Email Provider Setup

- Create or confirm the production email provider account.
- Verify the sending domain.
- Add the required SPF, DKIM, and DMARC records in DNS.
- Create the production SMTP credentials.
- In the backend production environment, set `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.
- Send a production test email if the provider supports dashboard-based testing.

## OAuth Provider Configuration

- For each approved OAuth provider, create the production OAuth application in that provider dashboard.
- Add the production backend callback URL for each enabled provider.
- Add the production frontend origin where the provider requires authorized origins.
- Copy the approved client IDs and client secrets into the backend production environment.
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if Google sign-in is enabled.
- Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` if GitHub sign-in is enabled.
- Set `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` if X/Twitter sign-in is enabled.
- Set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` if Discord sign-in is enabled.
- Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` if Microsoft sign-in is enabled.
- Set `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET` if Apple sign-in is enabled.
- Leave every unapproved OAuth provider disabled.

## Production Verification and Launch Checks

- Open the production frontend URL and confirm the app loads.
- Open the production backend `/health` URL and confirm it returns HTTP 200.
- In the browser network panel, confirm the frontend calls the production backend URL.
- Confirm the landing page, hero section, and section navigation render correctly on desktop and mobile.
- Refresh each main production route directly in the browser and confirm it still loads.
- Open the Connect Agent modal in production.
- Confirm the Prompt, Link, SDK, and Live Channel connection flows work with production credentials.
- Confirm Socket.io connections are accepted from the production frontend origin.
- Confirm the approved LLM provider works in production.
- Confirm production email delivery works if email auth or notifications are enabled.
- Confirm each enabled OAuth provider completes a full production sign-in round trip.
- Review production logs and confirm no secrets, access tokens, API keys, or OAuth secrets are exposed.
- Store any generated production API key in the approved secret manager immediately.
- Revoke leaked, duplicate, test, or unused production API keys before launch.

## Manual Approval or Review Steps

- Approve the final production hosting plans and expected monthly spend.
- Approve the production domains before DNS is switched.
- Approve which OAuth providers are enabled at launch.
- Approve which LLM provider handles launch traffic.
- Approve the production email sender identity and reply-to policy.
- Review backup and restore ownership before launch.
- Review the production secret inventory and confirm every required secret has an owner.
- Review provider security warnings in the hosting, database, OAuth, and email dashboards.
- Make the final go/no-go launch decision after all production checks pass.
