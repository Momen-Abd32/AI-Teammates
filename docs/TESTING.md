# Testing Strategy

## 1. Goals

Testing should validate functional behavior and the security boundaries around multi-tenancy, AI output, tools, memory, approvals, device actions and sandbox execution. A green compile is necessary but does not prove that provider credentials, external services or device workflows work end-to-end.

## 2. Current test locations

The repository includes tests under `apps/api/src`, including agent/auth services, collaboration worker/service, device service, orchestrator service, tool execution/policy, and security-focused tests. Package scripts should be checked before assuming every workspace has the same test command.

## 3. Test layers

### Unit tests
Test deterministic service logic without external provider calls:
- task status transitions and validation;
- role/stage matching and bounded retry behavior;
- tool allow/deny/approval decisions;
- memory scope and safe-memory rules;
- device policy and command validation;
- auth token parsing and role checks.

### Integration tests
Run against test instances of required infrastructure:
- PostgreSQL schema, repositories and tenant-scoped queries;
- pgvector storage and similarity search;
- Redis streams/worker behavior when Redis mode is enabled;
- API routes and authorization context;
- approval persistence and resumption.

### Agent/provider tests
Use mocks or controlled test credentials to cover:
- provider key missing;
- provider returns authentication/quota/model errors;
- malformed model output;
- tool plan denied by policy;
- tool execution waiting for approval;
- run completion/failure and bounded retries.

Do not make ordinary unit tests depend on paid live model calls unless explicitly designed as opt-in integration tests.

### Security tests
Include:
- cross-tenant resource access;
- cross-employee agent/device/memory access;
- private-memory leakage;
- prompt injection in task/repository content;
- tool policy bypass attempts;
- approval replay/mismatched execution IDs;
- device action/command allowlist violations;
- workspace path traversal and symlink escape;
- sandbox timeout and resource restriction checks.

### End-to-end tests
A representative workflow is:

1. Register/login.
2. Create or select an agent.
3. Configure provider/model and permissions.
4. Submit a task.
5. Observe agent run and tool decisions.
6. Approve or reject a sensitive action.
7. Verify task status and persisted result.
8. Verify audit/activity event.
9. For team chat, verify Coding, Testing and Documentation stage selection, skip behavior and failure blocking.

Device and browser E2E tests require an actual test device/browser environment.

## 4. Useful local commands

From the repository root:

```powershell
pnpm install
pnpm --filter @ai-teammates/api build
pnpm --filter @ai-teammates/api test
pnpm --filter @ai-teammates/web build
python -m compileall apps/agent-service/app
```

The API package currently defines `build`, `start`, `test` and `lint` scripts. The web package defines `dev`, `build`, `start` and `lint`. Verify the scripts in each package before using root recursive commands.

## 5. CI validation

The root README describes repository CI checks for API tests/type checking, web type checking/build, desktop-agent type checking, API build, Python syntax and Docker Compose configuration. Confirm the latest workflow run before describing a particular commit as CI-green.

## 6. Test data and secrets

- Use dedicated test databases and credentials.
- Never run destructive tests against a developer's real database.
- Use fake API keys for missing-key and invalid-key tests.
- Do not store provider keys in snapshots or fixtures.
- Redact tokens and personal data from test logs.

## 7. Release gates

A release candidate should not be considered verified until:
- [ ] affected package builds pass;
- [ ] relevant unit and integration tests pass;
- [ ] migrations work on a clean database and an upgrade path;
- [ ] provider failure modes are tested;
- [ ] approval and permission boundaries are tested;
- [ ] local/device and sandbox paths have the required E2E evidence;
- [ ] docs and environment examples are updated;
- [ ] no secrets or unrelated changes appear in the diff.
