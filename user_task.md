# Flowfex Human Operator Checklist

This file is the single source of truth for Flowfex work that requires a person to complete in external dashboards, portals, providers, or production environments.

## Hosting and Deployment Accounts

- Create or confirm the Vercel account and project that will host the Flowfex frontend.
- Create or confirm the Render account and Web Service that will host the Flowfex backend as a long-running Node service.
- Choose the production deployment plan for each hosting provider.
- Connect the production Git repository to the selected Vercel and Render projects.
- In Vercel, choose the intended project root for the frontend deployment.
- In Render, confirm the backend service uses HTTPS and supports WebSocket traffic.
- Confirm the Render health check path is set to /health.

## Environment Variables and Secrets

- Generate and store a production FLOWFEX_LINK_SECRET in a password manager or secret manager.
- Set VITE_APP_URL in the frontend hosting environment.
- Set VITE_BACKEND_URL in the frontend hosting environment.
- Set FLOWFEX_PUBLIC_ORIGIN in the backend hosting environment.
- Set ALLOWED_ORIGINS in the backend hosting environment with the production frontend origin and any approved staging origins.
- Set FLOWFEX_LINK_SECRET in the backend hosting environment.
- Set FLOWFEX_CONNECTION_API_KEY in the backend hosting environment if restricted server-to-server connection flows are required.
- Add exactly the LLM provider keys approved for production use: GROQ_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.
- Keep backend-only secrets out of Vercel frontend build variables.
- Store all production secrets in the hosting provider secret manager or an approved external secret manager.
- Keep staging, preview, and production secrets separate.
- Rotate any secret that was shared in chat, committed, exposed in logs, or pasted into the wrong dashboard.

## Database and Persistence Provider Setup

- Create the production database project in the chosen Postgres provider, such as Neon.
- Choose the production database region and plan.
- Copy the production DATABASE_URL from the database provider dashboard.
- Set DATABASE_URL only in the backend production environment.
- Configure database backups, retention, and restore access in the provider dashboard.
- Confirm the database provider allows connections from the backend hosting environment.
- Save database admin access and connection details in the approved password manager or secret manager.

## Auth Provider Setup

- Generate and store a production BETTER_AUTH_SECRET.
- Set BETTER_AUTH_SECRET in the backend production environment.
- Set BETTER_AUTH_URL to the public backend auth origin.
- Confirm the public frontend URL is allowed as an application origin in the auth provider configuration.
- Confirm the production dashboard redirect URL is allowed.
- Confirm any staging or preview redirect URLs are intentionally allowed before launch.
- Decide whether email verification is required before production sign-in.
- Confirm sign-out, session expiration, and account recovery policies in the external auth configuration.

## DNS and Domain Configuration

- Choose the production frontend domain, for example app.yourdomain.com.
- Choose the production backend domain, for example api.yourdomain.com.
- Add the required DNS records for the frontend domain in the DNS provider dashboard.
- Add the required DNS records for the backend domain in the DNS provider dashboard.
- Complete domain verification in Vercel.
- Complete domain verification in Render.
- Wait for DNS propagation.
- Confirm valid TLS certificates are active for the frontend and backend domains.
- Confirm the production frontend uses HTTPS.
- Confirm the production backend uses HTTPS.

## SMTP/Email Provider Setup

- Create or confirm the production email provider account.
- Choose the sending domain and sender address for Flowfex email.
- Verify the sending domain in the email provider dashboard.
- Add required SPF, DKIM, and DMARC records in DNS.
- Create SMTP credentials for production.
- Set EMAIL_FROM in the backend production environment.
- Set SMTP_HOST in the backend production environment.
- Set SMTP_PORT in the backend production environment.
- Set SMTP_USER in the backend production environment.
- Set SMTP_PASS in the backend production environment.
- Send a production test email from the provider dashboard if the provider supports it.

## OAuth Provider Configuration

- For each OAuth provider approved for launch, create a production OAuth application in that provider dashboard.
- Add the production callback URL exposed by the Flowfex backend auth route.
- Add the production frontend origin where the provider requires authorized origins.
- Copy the provider client ID and client secret into the backend hosting environment.
- For Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET if Google sign-in is enabled.
- For GitHub OAuth, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET if GitHub sign-in is enabled.
- For Twitter/X OAuth, set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET if Twitter/X sign-in is enabled.
- For Discord OAuth, set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET if Discord sign-in is enabled.
- For Microsoft OAuth, set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET if Microsoft sign-in is enabled.
- For Apple OAuth, set APPLE_CLIENT_ID and APPLE_CLIENT_SECRET if Apple sign-in is enabled.
- Disable or leave unconfigured any OAuth provider that is not approved for production launch.

## Production Verification and Launch Checks

- Confirm the deployed frontend loads at the production frontend URL.
- Confirm the deployed backend health endpoint returns HTTP 200 at /health.
- Confirm the frontend calls the production backend URL, not localhost or a preview backend.
- Confirm the landing page hero is not visually cut off on desktop and mobile browsers.
- Confirm the right-side landing page dot navigation is visible on desktop and scrolls to the correct sections.
- Confirm direct browser refresh works for the main production routes.
- Confirm the Connect Agent modal opens in production.
- Confirm Prompt connection bootstrap works against the production backend.
- Confirm Link connection bootstrap works against the production backend.
- Confirm SDK connection bootstrap works with approved production credentials.
- Confirm Live Channel connection bootstrap works with approved production credentials.
- Confirm Socket.io connections are accepted from the production frontend origin.
- Confirm the configured LLM provider works with the production backend.
- Confirm production email delivery works if email auth or notifications are enabled.
- Confirm each enabled OAuth provider can complete a sign-in round trip.
- Confirm generated API keys are stored immediately in an approved password manager or secret manager.
- Confirm leaked, test, or unused API keys are revoked before launch.
- Confirm production logs do not expose secrets, access tokens, API keys, or OAuth secrets.

## Manual Approval or Review Steps

- Approve the final production hosting plans and expected monthly spend.
- Approve the production domains before DNS is switched.
- Approve which OAuth providers are enabled at launch.
- Approve which LLM provider is used for launch traffic.
- Approve the production email sender identity and reply-to policy.
- Review database backup and restore ownership before launch.
- Review the production secret inventory and confirm every required secret has an owner.
- Review any provider security warnings in Vercel, Render, Neon, OAuth consoles, and the email provider dashboard.
- Perform the final go/no-go launch decision after production verification passes.
