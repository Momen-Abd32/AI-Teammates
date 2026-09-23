# AI Teammates
A multi-tenant AI workforce platform where every employee has a personal AI teammate.

## Architecture
Next.js -> NestJS -> PostgreSQL/pgvector + Redis -> Python/FastAPI Agent Runtime -> tools/sandbox.

## Principles
- The agent learns work, not the person.
- Authorization is enforced outside the LLM.
- Private memory is isolated.
- Sensitive actions require human approval.
- Important actions are auditable.

## Development
Copy .env.example to .env.
Start infrastructure with docker compose up -d postgres redis.
Run API, web, and agent-service from their workspaces.

## Status
Core architecture is implemented. Remaining production hardening includes full OIDC/JWT integration, persistent authorization on every route, isolated code execution, encryption and secret management, comprehensive integration/E2E tests, and deployment automation.
