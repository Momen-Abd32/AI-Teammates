# AI Teammates
A multi-tenant AI workforce platform where every employee has a personal AI teammate.

## Architecture

`Next.js -> NestJS -> Agent Planner -> Tool Policy/Approval -> Device Gateway -> Desktop Agent`

Supporting services:
- PostgreSQL + pgvector
- Redis
- Python/FastAPI Agent Runtime
- Sandbox Worker
- GitHub tools
- Shared same-device desktop runtime

## Same-device multi-agent model

`Employee -> one physical device -> Coding / Testing / Documentation / Communication / Monitoring agents`

Each agent has its own identity, role, permissions, memory namespace, conversations and runs. The desktop runtime receives an `agentId` on every command and enforces both global device policy and optional per-agent policy.

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
- Agent collaboration and delegated task lifecycle are supported.
- Audit/activity events are emitted for important execution steps.

## Development

Copy `.env.example` to `.env`.

Start infrastructure:

```bash
docker compose up -d postgres redis
```

Run the API, web, agent-service and desktop-agent from their workspaces. Configure `DEVICE_TOKEN` and `DEVICE_WORKSPACE` for the local desktop runtime. Browser/screenshot support additionally requires `DEVICE_BROWSER_CDP_URL` pointing at a Chromium DevTools endpoint.

## Validation

The repository CI validates:
- API typecheck and tests
- Web typecheck and build
- Desktop-agent typecheck
- API build
- Python syntax
- Docker Compose configuration

The current integrated CI pipeline is green on the latest validated commit.

## Remaining production work

The core MVP execution path is implemented. Before a public production deployment, the remaining work is operational rather than architectural: full deployment automation, stronger secret/key management, production identity-provider integration where required, monitoring/alerting, backup/restore procedures, and a real-device/browser integration test environment.
