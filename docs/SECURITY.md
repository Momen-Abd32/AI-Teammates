# Security Model

## 1. Security principles

- Tenant/company context must be applied to company-owned resources.
- The LLM does not grant itself authorization. Server-side policy decides which tools/actions are permitted.
- Private memory must be isolated by employee/agent ownership.
- Sensitive tool actions can require persisted human approval.
- Untrusted user/task/repository content must be treated as data, not as higher-priority instructions.
- Secrets must never be stored in work memory, committed to Git, or included in documentation.
- Security-relevant actions should be auditable.
- Sandbox code execution should remain isolated from application secrets and host resources.

## 2. Trust boundaries

### Browser to API
The browser is an untrusted client. It may request an action, but the API must authenticate the caller, derive tenant/employee identity from trusted context, validate resource ownership and enforce permissions.

### API to agent service
Model output is untrusted input. It must not bypass API policy, approval requirements, task ownership checks or device allowlists.

### API to desktop agent
The device token authenticates the runtime connection. Device commands must be scoped to a registered device and target agent. The desktop agent additionally enforces local global and optional per-agent policy.

### API to sandbox worker
The sandbox worker is a separate service requiring Docker Engine. Keep it on a restricted network, limit who can call it, and do not mount the Docker socket into the API. Docker access is highly privileged.

### Memory
Only approved work context should be stored. Validate memory scope and ownership on write and read. Do not store credentials, personal employee information unrelated to work, or arbitrary secrets in embeddings.

## 3. Tool policy and approval

Tool execution should be requested through the API's tool registry and policy service. Depending on the tool/action, policy can allow, deny or require human approval. Approval is tied to an execution/action; it must not become a blanket grant for future unrelated actions.

Approval decisions and execution results should remain associated with company, employee, agent and task context.

## 4. Desktop-agent restrictions

The desktop agent:
- requires `DEVICE_TOKEN` to start;
- confines file access to `DEVICE_WORKSPACE`;
- applies a global action allowlist;
- can apply additional per-agent restrictions;
- uses a command allowlist and executes without a shell;
- limits execution time and output/file size;
- optionally connects to a Chromium DevTools endpoint for browser operations/screenshots.

These are application-level controls, not a full operating-system sandbox. Use OS permissions and isolation as additional layers. Keep the workspace narrow and do not add shell interpreters to the allowlist without a security review.

## 5. Secrets management

For local development:
- keep `.env` out of version control;
- replace sample secrets such as `AUTH_SECRET`;
- use least-privilege API keys;
- never print secret values during diagnostics;
- rotate credentials if they are accidentally exposed.

For production:
- use a managed secret store or protected deployment secrets;
- separate development and production credentials;
- rotate device tokens and provider keys;
- avoid passing credentials in URLs;
- redact authorization headers and request bodies from logs.

## 6. Known production gaps and cautions

The repository documentation identifies additional work before public production deployment, including:
- production-grade identity provider integration and reviewed session/token lifecycle;
- stronger secret/key management;
- explicit database authorization strategy such as RBAC/ABAC where needed;
- HTTPS, strict CORS/origin policy and CSRF review for browser flows;
- rate limiting and abuse controls;
- dependency and secret scanning;
- monitoring/alerting and audit review;
- encrypted backups and tested restoration;
- real-device/browser integration tests;
- a dedicated short-lived WebSocket ticket instead of a long-lived application token in a WebSocket URL where applicable.

Do not claim the system is production-secure solely because it has policy services, approvals or allowlists. Security must be tested at each boundary.

## 7. Security review checklist

Before release, verify:
- [ ] Cross-tenant requests are rejected.
- [ ] Cross-employee agent/device/memory access is rejected.
- [ ] Missing/invalid tokens fail closed.
- [ ] Sensitive tools cannot run without required approval.
- [ ] Rejected approvals do not execute the action.
- [ ] Device commands outside the global allowlist are rejected.
- [ ] Agent policy can narrow, but not widen, global device permissions.
- [ ] File traversal and symlink escapes are rejected.
- [ ] Terminal shell operators and disallowed commands are rejected.
- [ ] Sandbox networking and privileges match the intended threat model.
- [ ] Secrets are absent from Git history, logs and work memory.
- [ ] Dependency scans, backups and recovery are verified.
