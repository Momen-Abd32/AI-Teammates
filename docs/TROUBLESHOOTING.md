# Troubleshooting Guide

## 1. Start with health checks

Open:

- API: `http://localhost:3001/api/health`
- Agent service: `http://localhost:8000/health`

API health returns dependency checks. A response such as:

```json
{"status":"ok","checks":{"database":"up","redis":"disabled"}}
```

means the API can reach PostgreSQL and Redis is intentionally disabled. It does not verify provider credentials, embeddings, device connectivity, or the sandbox worker.

## 2. Web page says “Could not load your workspace”

1. Confirm the API health endpoint responds.
2. Open browser DevTools (F12) → Network → Fetch/XHR.
3. Reload the page and inspect the failed request's Request URL and status.
4. Check the Console for CORS errors.
5. Confirm the URL uses the expected API base (normally `http://localhost:3001/api`).
6. Make sure the API CORS configuration allows the exact web origin, including port.

`http://localhost:3000` and `http://localhost:3002` are different browser origins. PowerShell does not enforce browser CORS, so a successful `Invoke-RestMethod` call does not disprove CORS.

## 3. “Memory embeddings are not configured”

Current API code reads `OPENAI_API_KEY` in `apps/api/src/memory/embedding.service.ts`. If the variable is missing or empty in the API process, embedding calls fail.

Check presence without printing the secret:

```powershell
if ($env:OPENAI_API_KEY) { "OPENAI_API_KEY is set in this shell" } else { "OPENAI_API_KEY is not set in this shell" }
```

To check the local `.env` without exposing the value:

```powershell
Select-String -Path .env -Pattern '^OPENAI_API_KEY=' |
  ForEach-Object {
    if ($_.Line -match '^OPENAI_API_KEY=\s*\S+') {
      "OPENAI_API_KEY is present and non-empty"
    } else {
      "OPENAI_API_KEY is present but empty"
    }
  }
```

A value in `.env` is useful only if the API process actually loads that file. After changing it, restart the process. Do not paste the key into chat or logs. OpenAI API usage may incur separate charges from a ChatGPT subscription.

## 4. Agent provider is not configured

The Python agent service reads provider-specific variables:
- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Gemini: `GEMINI_API_KEY`

The configured agent provider/model must match the key available to the running agent-service. The model identifier must also be supported by the provider/account. A healthy API or agent-service endpoint does not prove a real model request will succeed.

## 5. Team stage is skipped

The Team workflow matches roles by text patterns. Configure separate agents whose role/instructions clearly identify Coding, Testing and Documentation. Each must have `agent.chat` and `agent.collaborate` permissions to be eligible.

Examples:
- Coding: `Coding Agent` or `Software Developer`
- Testing: `QA Tester` or `Testing Engineer`
- Documentation: `Documentation Specialist` or `Technical Writer`

The examples are suggested role labels, not required exact names.

## 6. Redis reports “disabled”

This is expected when `REDIS_ENABLED=false`. In this mode:
- API and UI can be used for local development if other dependencies are configured.
- In-process activity events can work.
- Redis-backed task queues/streams and cross-process event delivery are disabled.

Enable Redis only after configuring a working `REDIS_URL` and ensuring the service is reachable.

## 7. API starts but endpoint returns 404

A 404 can mean the server is reachable but the requested path/method is not registered. For example, requesting `GET /api` is not the same as requesting `GET /api/health`. Check the route's HTTP method, global `/api` prefix and controller path.

## 8. Next.js uses port 3002 instead of 3000

Port 3000 is occupied. Next.js may automatically select another port. Use the exact URL printed in the terminal and add that origin to API CORS configuration. Alternatively, stop the process occupying 3000 if it is safe to do so.

## 9. API code changes appear to have no effect

If running the compiled API with `pnpm --filter @ai-teammates/api start`, it executes `apps/api/dist/main.js`. After changing TypeScript source:
1. stop the API process with Ctrl+C,
2. run `pnpm --filter @ai-teammates/api build`,
3. restart it with `pnpm --filter @ai-teammates/api start`.

## 10. Database schema mismatch

Errors such as “column does not exist” indicate the running database schema and application code may be out of sync. Compare the migration list with the actual database. Avoid ad hoc production SQL as the permanent fix; record required schema changes in a migration and test a clean setup.

## 11. Safe diagnostic sharing

Share the failing URL, status code, sanitized error message and relevant non-secret logs. Never share:
- API keys or passwords,
- `Authorization` headers,
- cookies or session tokens,
- full `.env` files,
- private data from task/memory tables.
