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
