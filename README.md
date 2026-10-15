# AI Teammates

A multi-tenant AI workforce platform where every employee has a personal AI teammate.

## Architecture

\`Next.js -> NestJS -> Agent Planner -> Tool Policy/Approval -> Device Gateway -> Desktop Agent\`

Supporting services:
- PostgreSQL + pgvector
- Redis (stream-based delegation and cross-process activity events)
- Python/FastAPI Agent Runtime
- Optional sandbox worker (requires Docker Engine)
- GitHub tools
- Shared same-device desktop runtime

## Same-device multi-agent model

\`Employee -> one physical device -> Coding / Testing / Documentation / Communication / Monitoring agents\`

Each agent has its own identity, role, permissions, memory namespace, conversations and runs. The desktop runtime receives an \`agentId\` on every command and enforces both global device policy and optional per-agent policy.

## Runtime guarantees

- The agent learns work, not private employee information.
- Authorization is enforced outside the LLM.
- Sensitive tools can require human approval.
- Approval can pause and resume an agent run.
- Device commands are persisted and correlated with their agent/device.
- Desktop terminal execution uses an allowlist, no shell, workspace confinement, timeout and output limits.
- File access is confined to the configured workspace.
- Browser navigation is restricted to HTTP/HTTPS and uses optional Chrome DevTools Protocol integration.
- Device command completion is idempotent and delivery failures are finalized.
- Agent collaboration and delegated task lifecycle are supported when Redis is enabled.
- Audit/activity events are emitted for important execution steps.

## Development with Docker

Copy \`.env.example\` to \`.env\`, configure your API keys and a strong \`AUTH_SECRET\`, then run:

\`\`\`bash
docker compose up -d postgres redis
\`\`\`

Run the API, web, agent-service and desktop-agent from their workspaces. Configure \`DEVICE_TOKEN\` and \`DEVICE_WORKSPACE\` for the local desktop runtime. Browser/screenshot support additionally requires \`DEVICE_BROWSER_CDP_URL\` pointing at a Chromium DevTools endpoint.

## Development on Windows without Docker Desktop

The API can start without Redis for local UI/API development. Redis-backed task streams and cross-process activity delivery are disabled in this mode; in-process activity events still work. PostgreSQL with the \`pgvector\` extension is still required for persistent application data and memory embeddings.

1. Install Node.js 22+, pnpm 10+, Python 3.12+, and PostgreSQL. Ensure your PostgreSQL installation supports the \`vector\` extension (\`pgvector\`).
2. Create the database named \`ai_teammates\` and apply the schema from the repository root:

   \`\`\`powershell
   psql -U postgres -d ai_teammates -f .\infrastructure\postgres\schema.sql
   \`\`\`

3. Copy \`.env.example\` to \`.env\`. Set \`DATABASE_URL\` to your local PostgreSQL credentials, set \`AUTH_SECRET\` to a long random secret, and add whichever LLM API key you intend to use.
4. Keep \`REDIS_ENABLED=false\` for Docker-free development. If you have a working Redis-compatible service, set it to \`true\` and configure \`REDIS_URL\`.
5. From the repository root, run:

   \`\`\`powershell
   .\scripts\dev-windows.ps1 -Install
   \`\`\`

   The script installs workspace/Python dependencies if requested and opens separate terminals for the API, web UI, and Python agent service. If \`DEVICE_TOKEN\` is set in \`.env\`, it also starts the desktop agent. The web UI is at \`http://localhost:3000\`, the API health endpoint is \`http://localhost:3001/api/health\`, and the agent service health endpoint is \`http://localhost:8000/health\`.

The script checks ports 3000, 3001 and 8000 before starting, to prevent Next.js silently moving to a conflicting port. If Docker Desktop is still holding one of these ports, close Docker Desktop cleanly and rerun the script.

The sandbox worker is intentionally not started by this script because its isolation boundary uses Docker Engine. Sandbox execution remains unavailable in this no-Docker mode; do not replace it with unrestricted host-shell execution.

## Validation

The repository CI validates:
- API typecheck and tests
- Web typecheck and build
- Desktop-agent typecheck
- API build
- Python syntax
- Docker Compose configuration

## Remaining production work

Before a public production deployment, complete deployment automation, stronger secret/key management, production identity-provider integration where required, monitoring/alerting, backup/restore procedures, and a real-device/browser integration test environment.


## Documentation

The technical documentation index is available in [`docs/README.md`](docs/README.md). Start with:

- [System Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT_GUIDE.md)
- [Configuration Reference](docs/CONFIGURATION.md)
- [Team Orchestration](docs/TEAM_ORCHESTRATION.md)
- [Memory and Embeddings](docs/MEMORY_AND_EMBEDDINGS.md)
- [Database and Migrations](docs/DATABASE.md)
- [Device Runtime](docs/DEVICE_RUNTIME.md)
- [API Reference](docs/API.md)
- [Security Model](docs/SECURITY.md)
- [Testing Strategy](docs/TESTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
