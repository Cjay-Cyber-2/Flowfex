# Flowfex — Tasks Requiring Human Intervention

## 1. Backend Deployment
The Flowfex backend runs on port 4000 and cannot run on Vercel's static hosting. You need a separate deployment target:
- **Railway**, **Render**, **Fly.io**, or **Vercel Serverless Functions**
- Set the `VITE_BACKEND_URL` environment variable in your Vercel frontend when the backend is not served from the same origin
- If you keep the frontend and backend on separate hosts, verify the API origin before trying to attach agents

## 2. Environment Variables
The backend `.env` file needs:
- `PORT` — server port (default 4000)
- Any LLM API keys required for tool execution (e.g., `OPENAI_API_KEY`)
- `VITE_APP_URL` if you want generated connect links to point at a specific public host instead of the current runtime origin

## 3. Domain & DNS
- `app.flowfex.io` must resolve properly for connect links to work
- Backend needs CORS configured for the Vercel frontend domain

## 4. Human-in-the-Loop Attach
These steps cannot be completed safely by the app alone:
- Paste the generated prompt or session link into the target agent
- Confirm the attach in the onboarding modal after the external agent is ready
- If the connection payload never appears, stop and fix the backend deployment instead of retrying the frontend forever

## 5. Blocked Skills (2)
These skills were blocked by the security validator due to `prompt-injection` / `hidden-behavior` patterns. Review and whitelist if they are safe:
1. `skill.security.unsafe-secret-extractor`
2. `skill.dangerous-exfiltration`

## 6. Duplicate Skills (6)
Six RAG tutorial skills have duplicate IDs because they exist in both `awesome-llm-apps` and `skills-md`. The first copy is kept; duplicates are logged but not loaded:
- `skill.rag-tutorials.autonomous-rag`
- `skill.rag-tutorials.corrective-rag`
- `skill.rag-tutorials.gemini-agentic-rag`
- `skill.rag-tutorials.hybrid-search-rag`
- `skill.rag-tutorials.local-rag-agent`
- `skill.rag-tutorials.vision-rag`

## 7. Vercel Routing
Ensure `vercel.json` has a catch-all rewrite for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
