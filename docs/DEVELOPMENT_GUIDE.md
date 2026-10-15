# Development Guide

## 1. Intended audience

This guide is for developers who need to run, test or modify AI Teammates locally. Commands below assume a PowerShell terminal on Windows unless stated otherwise. Keep secrets in a local `.env`; never commit that file.

## 2. Repository layout

```text
AI-Teammates/
├── apps/
│   ├── web/             # Next.js user interface
│   ├── api/             # NestJS application API
│   ├── agent-service/   # Python/FastAPI LLM runtime
│   ├── desktop-agent/   # Local device runtime
│   └── sandbox-worker/  # Docker-backed isolated code execution
├── packages/
│   ├── config/          # Shared configuration package
│   ├── shared/          # Shared utilities/types
│   └── types/           # Shared types
├── infrastructure/
│   ├── postgres/        # Schema and migrations
│   └── redis/           # Redis configuration
├── docs/                # Technical documentation
├── scripts/             # Development helpers
├── docker-compose.yml
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

The layout above describes the repository's main areas; individual folders may contain additional files.

## 3. Prerequisites

For the documented Windows no-Docker mode:

- Node.js 22 or newer.
- pnpm 10 or newer.
- Python 3.12 or newer.
- PostgreSQL with the pgvector extension available.
- Git.
- API credentials for the provider(s) you intend to use. Memory embeddings currently require an OpenAI API key.
- Redis is optional for basic local UI/API development, but Redis-backed collaboration/event delivery needs it enabled.
- Docker Engine is required for the sandbox worker.

Verify installed tools:

```powershell
node --version
pnpm --version
python --version
psql --version
git --version
```

## 4. Clone and install

```powershell
git clone https://github.com/Momen-Abd32/AI-Teammates.git
cd AI-Teammates
pnpm install
```

If you already have a working checkout, first inspect local changes with `git status --short`. Do not overwrite or discard changes without reviewing them.

## 5. Configure environment

Copy the example file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set at least:

- `DATABASE_URL` to your local PostgreSQL database.
- `AUTH_SECRET` to a long, random secret.
- `OPENAI_API_KEY` if using OpenAI or the current API memory embedding implementation.
- The relevant provider key for the selected agent model.
- `REDIS_ENABLED=false` if intentionally running without Redis.
- Device variables only if running the desktop agent.

Do not paste the contents of `.env` into issues, chat messages or logs. See [Configuration Reference](CONFIGURATION.md).

## 6. Database setup

Create the database and ensure pgvector is installed/enabled according to your PostgreSQL installation. The repository provides a schema and incremental migrations under `infrastructure/postgres`.

Typical initial schema command:

```powershell
psql -U postgres -d ai_teammates -f .\infrastructure\postgres\schema.sql
```

The exact database name and credentials must match `DATABASE_URL`. If the database already contains data, back it up before applying schema or migration changes. Read [Database and Migrations](DATABASE.md) before modifying schema.

## 7. Start local services

### Option A — helper script

The repository README describes the Windows helper:

```powershell
.\scripts\dev-windows.ps1 -Install
```

Review the script before running it and follow its terminal output. It opens separate terminals for the services it starts. The script checks common ports to avoid Next.js silently choosing a different port.

### Option B — run services manually

Install JavaScript dependencies from the repository root:

```powershell
pnpm install
```

API:

```powershell
pnpm --filter @ai-teammates/api build
pnpm --filter @ai-teammates/api start
```

Web UI in a separate terminal:

```powershell
pnpm --filter @ai-teammates/web dev
```

Python agent service in another terminal (from repository root):

```powershell
cd apps/agent-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The desktop agent is optional. Run it only after configuring a valid device token, workspace and allowed actions. The sandbox worker is also optional and needs Docker Engine.

### Default local addresses

| Service | Default URL | Notes |
|---|---|---|
| Web UI | http://localhost:3000 | If occupied, Next.js may use another port |
| API health | http://localhost:3001/api/health | Checks database and Redis status |
| Agent service health | http://localhost:8000/health | Lists configured provider names, not secret values |
| Team page | http://localhost:3000/team | Requires a running web UI |
| Agent management | http://localhost:3000/my-agent | Requires a running web UI |

If the web server starts on port 3002, use that port in the browser and ensure the API CORS configuration allows that exact origin.

## 8. Build and validate

```powershell
pnpm --filter @ai-teammates/api build
pnpm --filter @ai-teammates/web build
pnpm --filter @ai-teammates/api test
```

The root package also defines recursive build, test and lint scripts. A command can be skipped by a workspace package if it does not implement that script, so inspect each package's `package.json` when troubleshooting.

For Python syntax validation:

```powershell
python -m compileall apps/agent-service/app
```

A successful build proves compilation/build checks passed; it does not prove external API credentials work, database migrations are complete, or device/sandbox E2E behavior is correct.

## 9. Typical contribution workflow

1. Pull the latest branch and inspect `git status`.
2. Read the relevant module and its tests before editing.
3. Make a focused change that preserves tenant, authorization and approval boundaries.
4. Add or update unit/integration tests for behavior and failure paths.
5. Build the affected package and run its tests.
6. Update the matching documentation in the same change.
7. Review the diff for secrets, generated artifacts and unrelated changes.
8. Commit with a message describing the behavior change.

## 10. Local troubleshooting principles

- Test service health before debugging the UI.
- Use browser DevTools Network/Console to inspect the failing request URL, HTTP status and CORS message.
- Do not assume Redis is broken merely because it reports `disabled`; check the intended mode.
- Do not treat a valid API health response as proof that LLM provider calls or embeddings are configured.
- Keep passwords, tokens, cookies and API keys redacted when sharing logs.

See [Troubleshooting](TROUBLESHOOTING.md) for targeted checks.
