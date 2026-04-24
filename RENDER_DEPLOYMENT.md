# Flowfex Backend - Render Deployment Guide

This repo now includes a Render Blueprint at `/render.yaml` for the backend.

## Recommended Setup

Use Render for the backend and Vercel for the frontend:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Neon

## Fastest Path

1. Create a new Render Web Service from this repo.
2. Import the Blueprint from `/render.yaml`.
3. Confirm these backend settings:
   - Root Directory: `backend`
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/health`
4. Set the required environment variables:
   - `FLOWFEX_PUBLIC_ORIGIN`
   - `ALLOWED_ORIGINS`
5. Add one LLM provider key if you want real model calls:
   - `GROQ_API_KEY`, or
   - `OPENAI_API_KEY`, or
   - `ANTHROPIC_API_KEY`
6. Deploy.

## Minimum First-Tag Environment Variables

For the first hosted Flowfex tag, you do not need the unfinished Neon + Better Auth migration pieces yet.

Minimum backend/runtime values:

```env
FLOWFEX_PUBLIC_ORIGIN=https://api.yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com
FLOWFEX_LINK_SECRET=your-random-secret
GROQ_API_KEY=your-provider-key
```

Minimum frontend build values in Vercel:

```env
VITE_APP_URL=https://app.yourdomain.com
VITE_BACKEND_URL=https://api.yourdomain.com
```

Not required for the first tag:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- SMTP credentials
- OAuth provider credentials

Those values become relevant only after the remaining Neon + Better Auth migration work is completed.

## What The Backend Already Supports

The backend is already compatible with Render:

- It binds to `0.0.0.0`
- It reads `PORT`
- It exposes `GET /health`
- It serves HTTP and Socket.IO from the same long-running Node process

Those behaviors are implemented in:

- [backend/src/server/FlowfexServer.js](/home/gamp/Flowfex/backend/src/server/FlowfexServer.js:29)
- [backend/package.json](/home/gamp/Flowfex/backend/package.json:1)

## Frontend Wiring

After the Render backend is live, set this in your Vercel frontend project:

```env
VITE_BACKEND_URL=https://your-backend.onrender.com
```

Then redeploy the frontend.

The frontend reads the backend origin from:

- [frontend/src/utils/runtimeConfig.js](/home/gamp/Flowfex/frontend/src/utils/runtimeConfig.js:39)

## Important Notes

- Render Free is fine for testing, not for launch.
- Render Free spins down after 15 minutes of idle time.
- Render Free uses an ephemeral filesystem.
- Render Free blocks outbound network traffic on SMTP ports `25`, `465`, and `587`.
- This repo currently falls back to file-backed session state until the Neon migration is completed, so do not treat Render Free as durable backend storage.
- If you later enable SMTP-backed auth flows, verify your Render plan supports the outbound mail path you want to use.
