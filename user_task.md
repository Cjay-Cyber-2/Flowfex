# Flowfex Operator Checklist

Follow these steps manually in your provider dashboards to deploy Flowfex to production. Do not add code tasks here.

## Hosting (Vercel & Render)
- **Frontend (Vercel):** Create the project, connect your repository, and select the frontend root directory.
- **Backend (Render):** Create a Web Service, connect your repository, and allow HTTPS & WebSockets.
- **Health Check:** Set the Render health check path to `/health`.
- **Plans:** Approve production pricing plans for both providers.

## Environment Secrets
- **Generate:** Create secure strings for `FLOWFEX_LINK_SECRET` and `BETTER_AUTH_SECRET`.
- **Vercel Env:** Set `VITE_APP_URL` and `VITE_BACKEND_URL`.
- **Render Env:** Set `FLOWFEX_PUBLIC_ORIGIN`, `ALLOWED_ORIGINS`, `FLOWFEX_LINK_SECRET`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`.
- **LLM Keys:** Set `GROQ_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` in Render.

## Database
- **Create:** Provision a Postgres database in your dashboard (e.g., Neon or Supabase).
- **Connect:** Copy the `DATABASE_URL` and set it in your Render environment variables.
- **Backups:** Enable automated backups in the database dashboard.

## Domains & DNS
- **Add Domains:** Add your frontend and backend domains to Vercel and Render, respectively.
- **Configure DNS:** Copy the provided A/CNAME records into your DNS provider (e.g., Cloudflare, Namecheap).
- **Verify:** Wait for DNS to propagate and confirm HTTPS is active for both domains.

## Email (SMTP)
- **Account:** Create an account with Resend or your preferred SMTP provider.
- **Verify Domain:** Add the required SPF, DKIM, and DMARC records to your DNS settings.
- **Render Env:** Set `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.

## Authentication & OAuth
- **URLs:** Whitelist your frontend domain and callback URLs in your OAuth provider dashboards (Google, GitHub, etc.).
- **Client Keys:** Copy the provided Client IDs and Secrets into your Render environment variables (e.g., `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).

## Final Verification
- **Load Check:** Open the frontend URL and verify it loads without errors.
- **Backend Check:** Open `[backend-url]/health` and verify it returns HTTP 200.
- **Flow Test:** Connect an agent and verify it reaches the backend successfully.
- **Logs:** Review Render logs to ensure no secrets or API keys are exposed.
