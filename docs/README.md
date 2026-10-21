# AI Teammates Documentation

This directory is the technical documentation set for AI Teammates. It describes the current repository and separates implemented behavior from deployment requirements and future work.

## Start here

| Document | Audience | Purpose |
|---|---|---|
| [Product Evolution Principles](PRODUCT_EVOLUTION.md) | Product stakeholders and contributors | General-purpose AI workforce direction, provider extensibility, guided and advanced experiences, and delivery principles |
| [System Architecture](ARCHITECTURE.md) | Engineers, reviewers | Components, data flow, trust boundaries, and runtime topology |
| [Development Guide](DEVELOPMENT_GUIDE.md) | Contributors | Prerequisites, local setup, run/build/test workflow |
| [Configuration Reference](CONFIGURATION.md) | Developers and operators | Environment variables and provider/device settings |
| [Team Orchestration](TEAM_ORCHESTRATION.md) | Product and backend engineers | Team chat stages, role matching, task lifecycle, failure behavior |
| [Memory and Embeddings](MEMORY_AND_EMBEDDINGS.md) | AI/backend engineers | Memory scopes, semantic search, embedding provider requirements |
| [Database and Migrations](DATABASE.md) | Backend engineers | PostgreSQL, pgvector, schema and migration workflow |
| [Device Runtime](DEVICE_RUNTIME.md) | Desktop/runtime engineers | Device registration, commands, workspace boundaries, browser integration |
| [API Reference](API.md) | Frontend and integration engineers | HTTP endpoints grouped by domain |
| [Security Model](SECURITY.md) | All contributors | Authorization, approval boundaries, secrets, known production gaps |
| [Testing Strategy](TESTING.md) | Contributors and reviewers | Test layers, coverage expectations |
| [Troubleshooting](TROUBLESHOOTING.md) | Developers and local users | Common startup, CORS, provider, memory, Redis and agent issues |
| [Multi-Agent Device Runtime](MULTI_AGENT_DEVICE.md) | Runtime engineers | Agent-specific policy on a shared physical device |
| [Project Blueprint](PROJECT_BLUEPRINT.md) | Project stakeholders | Product goals, domains, and roadmap overview |
| [Submission Notes](SUBMISSION.md) | Reviewers | Project handoff and verification notes |

## Documentation rules

- Treat source code and executable tests as the source of truth.
- Do not describe a planned capability as implemented.
- Record whether a dependency is required, optional, or disabled in a particular development mode.
- Never place real API keys, passwords, device tokens, user data, or production connection strings in documentation.
- When an endpoint, environment variable, or workflow changes, update the matching document in the same change.
- Include the command used to verify a claim when the claim depends on a build or test result.

## Project at a glance

AI Teammates is a multi-tenant AI workforce platform. The web application talks to a NestJS API. The API owns application state, tenant context, task and approval workflows, tool policy, device commands, and orchestration. A Python/FastAPI service executes AI-agent runtime operations. PostgreSQL is the persistent data store; pgvector supports semantic memory. Redis enables cross-process task/event coordination when enabled. A desktop agent can perform explicitly allowed actions on a configured local workspace, while a separate sandbox worker can run a limited set of code languages in isolated containers when Docker Engine is available.

See [System Architecture](ARCHITECTURE.md) for the detailed flow and [Development Guide](DEVELOPMENT_GUIDE.md) for local setup.