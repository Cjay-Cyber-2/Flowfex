# Flowfex — Tasks Requiring Human Intervention

## 1. Backend Deployment
The Flowfex backend runs on port 4000 and cannot run on Vercel's static hosting. You need a separate deployment target:
- **Railway**, **Render**, **Fly.io**, or **Vercel Serverless Functions**
- Set the `VITE_BACKEND_URL` environment variable in your Vercel frontend to point to the deployed backend URL

## 2. Environment Variables
The backend `.env` file needs:
- `PORT` — server port (default 4000)
- Any LLM API keys required for tool execution (e.g., `OPENAI_API_KEY`)

## 3. Domain & DNS
- `app.flowfex.io` must resolve properly for connect links to work
- Backend needs CORS configured for the Vercel frontend domain

## 4. Blocked Skills (2)
These skills were blocked by the security validator due to `prompt-injection` / `hidden-behavior` patterns. Review and whitelist if they are safe:
1. `skill.security.unsafe-secret-extractor`
2. `skill.dangerous-exfiltration`

## 5. Duplicate Skills (6)
Six RAG tutorial skills have duplicate IDs because they exist in both `awesome-llm-apps` and `skills-md`. The first copy is kept; duplicates are logged but not loaded:
- `skill.rag-tutorials.autonomous-rag`
- `skill.rag-tutorials.corrective-rag`
- `skill.rag-tutorials.gemini-agentic-rag`
- `skill.rag-tutorials.hybrid-search-rag`
- `skill.rag-tutorials.local-rag-agent`
- `skill.rag-tutorials.vision-rag`

## 6. Vercel Routing
Ensure `vercel.json` has a catch-all rewrite for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
