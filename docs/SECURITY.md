# Security Model
- Tenant context is mandatory for company resources.
- The LLM never decides authorization; policy code does.
- Private memories are isolated by agent/employee.
- Agent-to-agent messages carry company/project/task context.
- Sensitive actions require human approval.
- Untrusted task content is treated as data, not instructions.
- Secrets must not enter work memory.
- Security-relevant actions are audited.
- Production code execution must run in an isolated sandbox.
Before production: replace demo auth with OIDC/JWT, add database RBAC/ABAC, secret management, encryption, rate limits, CORS/CSRF policy, dependency scanning and security tests.

## Tool execution hardening
- GitHub-backed tools require `GITHUB_TOKEN`; set `GITHUB_ALLOWED_REPOS` in production to an explicit allowlist.
- Repository writes/deletes and terminal execution require persisted human approval before execution.
- Terminal execution is routed through the isolated sandbox worker; the API must not mount the Docker socket.
- Activity WebSocket connections are authenticated before tenant-scoped events are delivered. The current browser client passes a short-lived application token in the WebSocket URL; replace this with a dedicated one-time WebSocket ticket before production to avoid credential exposure in URL logs/history.
- Run dependency scanning, secret scanning, rate limiting, origin/CORS controls, and security integration tests before production deployment.
