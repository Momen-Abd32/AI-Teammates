# Configuration Reference

## 1. General rules

Configuration is read from environment variables by the API, web app, Python runtime, desktop agent and sandbox worker. The repository's `.env.example` is the starting point, but a variable is only active in the service that reads it.

- Copy `.env.example` to a local `.env`.
- Never commit `.env` or share its values.
- Use provider keys only for providers you intend to call.
- Restart the affected service after changing environment values.
- Rebuild the API after TypeScript bootstrap/code changes; changing a source file does not change an already compiled `dist` process.

## 2. Core application settings

| Variable | Purpose | Notes |
|---|---|---|
| `NODE_ENV` | Node runtime environment | Use a production value only with production configuration |
| `DATABASE_URL` | PostgreSQL connection string | Must target the intended database and include correct credentials |
| `AUTH_SECRET` | Application auth/signing secret | Replace the example value with a long random secret |
| `API_PORT` | API listening port | Defaults to 3001 in API bootstrap |
| `WEB_PORT` | Intended web port | Check the actual Next.js startup output; port conflicts can change the port |
| `AGENT_SERVICE_URL` | Base URL for Python agent service | Local default is `http://localhost:8000` |
| `REDIS_ENABLED` | Enable Redis-backed infrastructure | Set false for local mode without Redis |
| `REDIS_URL` | Redis connection URL | Required when Redis is enabled |

## 3. AI provider settings

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI calls and current API memory embeddings |
| `OPENAI_MODEL` | Default OpenAI model configured for the agent runtime |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible API base URL for the Python runtime |
| `ANTHROPIC_API_KEY` | Anthropic provider authentication |
| `ANTHROPIC_MODEL` | Default Anthropic model |
| `GEMINI_API_KEY` | Gemini provider authentication |
| `GEMINI_MODEL` | Default Gemini model |
| `EMBEDDING_MODEL` | Embedding model override; default is `text-embedding-3-small` in the API embedding service |

Important: model names in an example configuration are defaults, not a guarantee that the model is available to a given account or provider endpoint. Verify the model identifier and account access with the provider.

### Embedding-specific behavior

The current API service `apps/api/src/memory/embedding.service.ts` reads `OPENAI_API_KEY` directly and calls the OpenAI embeddings endpoint. It expects a 1536-element vector. Therefore, configuring only an Anthropic or Gemini key does not configure API memory embeddings. The Python helper `apps/agent-service/app/embeddings.py` also uses OpenAI when the key is available.

## 4. Device runtime settings

| Variable | Purpose | Security notes |
|---|---|---|
| `DEVICE_WS_URL` | API device WebSocket URL | Defaults to `ws://localhost:3001/device` |
| `DEVICE_TOKEN` | Device authentication token | Required to start the desktop agent |
| `DEVICE_WORKSPACE` | Root directory the desktop agent may access | Use a dedicated project folder, not the whole user profile |
| `DEVICE_ALLOWED_ACTIONS` | Global comma-separated action allowlist | This is the maximum allowed action set |
| `DEVICE_ALLOWED_COMMANDS` | Global executable allowlist | Do not add shells or broad command launchers casually |
| `DEVICE_MAX_FILE_BYTES` | Maximum file size handled | Defaults to 2 MiB in desktop-agent code |
| `DEVICE_MAX_COMMAND_OUTPUT_BYTES` | Output cap for terminal commands | Defaults to 1 MiB |
| `DEVICE_COMMAND_TIMEOUT_MS` | Terminal timeout | Defaults to 30 seconds |
| `DEVICE_AGENT_POLICIES` | Optional JSON map of per-agent policies | Can narrow global actions/commands, not expand global permissions |
| `DEVICE_BROWSER_CDP_URL` | Optional Chromium DevTools endpoint | Exposes browser automation capabilities; protect the endpoint |
| `DEVICE_MAX_SCREENSHOT_BYTES` | Screenshot size limit | Defaults to 5 MiB |

Device policy is defense-in-depth, not a complete OS sandbox. Review [Device Runtime](DEVICE_RUNTIME.md).

## 5. GitHub integration

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Credential for GitHub-backed tools |
| `GITHUB_API_URL` | GitHub API base URL; defaults to public GitHub |
| `GITHUB_ALLOWED_REPOS` | Optional explicit repository allowlist; set it narrowly in production |

Avoid tokens with unnecessary organization or repository privileges.

## 6. Sandbox worker

| Variable | Purpose |
|---|---|
| `SANDBOX_WORKER_URL` | API-to-sandbox-worker base URL; local example uses port 8010 |

The worker requires Docker Engine. It supports only the languages and commands defined by the worker code. It is not interchangeable with unrestricted local terminal execution.

## 7. CORS and frontend API URL

The web app's API client defaults to `http://localhost:3001/api`. A `NEXT_PUBLIC_API_URL` value can override it. The API's CORS origins must match the exact browser origin, including the port. For example, `http://localhost:3002` is a different origin from `http://localhost:3000`.

If a browser reports `Failed to fetch`, inspect the Request URL and Console before changing environment values. PowerShell requests do not enforce browser CORS, so a successful PowerShell request does not rule out a CORS error.

## 8. Local-only versus production configuration

Local defaults are for development convenience, not production. Before deployment, rotate secrets, use managed secret storage, configure HTTPS and trusted origins, restrict GitHub repositories, secure device connectivity, and establish monitoring and backup/restore.
