# Flowfex Frontend - Vercel Deployment Guide

## 🚨 Critical Fix: 404 Error Resolution

The 404 error on Vercel was caused by two missing configurations:

1. **Vercel doesn't know where the source code is** - The frontend lives in `/frontend`, not the repo root
2. **Client-side routing not configured** - All URL routes like `/signin` and `/canvas` need to serve `index.html` for the SPA to work

## Vercel Configuration Files

Two `vercel.json` files have been created:

### 1. Root-level `/vercel.json`
Use this when Vercel's **Root Directory** setting is set to the repository root (`.`).

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 2. Frontend-level `/frontend/vercel.json`
Use this when Vercel's **Root Directory** setting is set to `frontend`.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Deployment Instructions

### Option A: Deploy from Repository Root (Recommended)

1. In your Vercel project settings, go to **Settings → General → Root Directory**
2. Leave it set to `.` (repository root) or leave it blank
3. Vercel will use the root-level `/vercel.json` configuration
4. Deploy

### Option B: Deploy from Frontend Directory

1. In your Vercel project settings, go to **Settings → General → Root Directory**
2. Set it to `frontend`
3. Vercel will use the `/frontend/vercel.json` configuration
4. Deploy

## Verification

After deployment, test these URLs:

- ✅ `https://your-deployment.vercel.app/` → Landing page loads
- ✅ `https://your-deployment.vercel.app/signin` → Sign-in page loads (not 404)
- ✅ `https://your-deployment.vercel.app/canvas` → Canvas page loads (not 404)
- ✅ Navigate to `/canvas` in-app, then refresh → Page still loads (not 404)

## ⚠️ Known Limitation: Backend Connectivity

The frontend needs a separately deployed backend for API and Socket.io features. A frontend-only Vercel deployment will not provide that backend by itself, so realtime and session APIs will fail until you point the frontend at a real backend.

This is handled gracefully:

- The error is caught and logged
- The canvas renders in offline mode
- No crashes or broken UI

To enable real-time features, you'll need to:
1. Deploy the backend on Render
2. Set `VITE_BACKEND_URL` (or `VITE_API_URL`) in Vercel to your Render backend URL
3. Redeploy the frontend
4. Configure `ALLOWED_ORIGINS` on the backend to allow requests from your Vercel domain

The frontend resolves the backend origin from:

- [frontend/src/utils/runtimeConfig.js](/home/gamp/Flowfex/frontend/src/utils/runtimeConfig.js:39)

The repo now includes Render backend setup files:

- [render.yaml](/home/gamp/Flowfex/render.yaml)
- [RENDER_DEPLOYMENT.md](/home/gamp/Flowfex/RENDER_DEPLOYMENT.md)

## UI/UX Fixes Included

This deployment also includes the following UI/UX improvements:

- ✅ Landing page scrolling fixed (removed `overflow: hidden` from `html, body`)
- ✅ Canvas app maintains fixed-height layout (added `overflow: hidden` to `.orchestration-canvas-page`)
- ✅ Geist font loading from Vercel CDN
- ✅ Scroll-reveal animations on feature sections
- ✅ Scroll-progress bar on landing page
- ✅ Toast notification system
- ✅ Canvas nodes rendered as rounded rectangles (per design spec)
- ✅ Proper icon usage (Code2 for SDK instead of Eye)
- ✅ WebSocket error handling for offline environments

## Build Locally

To test the production build locally before deploying:

```bash
cd frontend
npm install
npm run build
npm run preview
```

Then visit `http://localhost:4173` and test all routes.

## Troubleshooting

### Still getting 404 errors?

1. Check Vercel's build logs - ensure the build succeeded
2. Verify the Root Directory setting matches your chosen configuration
3. Check that `dist/index.html` exists in the build output
4. Clear Vercel's cache and redeploy

### Routes work on first load but 404 on refresh?

This means the rewrite rule isn't being applied. Double-check:
- The correct `vercel.json` file is being used
- The `rewrites` array is present and correct
- You've redeployed after adding the configuration

### Build fails?

Check that:
- `package.json` has all dependencies listed
- Node version is compatible (Vercel uses Node 18 by default)
- Build command is correct for your setup
