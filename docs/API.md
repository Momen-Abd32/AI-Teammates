# API Reference

This reference is based on the current NestJS controllers and the Python FastAPI service. The NestJS application uses the global `/api` prefix. Request/response fields can evolve with the source; check the controller/service for validation and exact response shapes.

## Conventions

- Base URL for local API: `http://localhost:3001/api`.
- JSON request bodies are used for most write operations.
- The authenticated user's company and employee context should come from the API authentication context, not client-supplied tenant IDs.
- The exact auth requirement varies by route/controller and guards. Do not assume that a route is public because this table lists it.
- A successful HTTP response does not guarantee an AI task completed successfully. Inspect returned task/stage status.
- Health: `GET /api/health`.

## NestJS API endpoints

### Health and authentication

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Checks PostgreSQL and reports Redis as up/down/disabled |
| POST | `/api/auth/register-company` | Registers a company and initial user according to AuthService |
| POST | `/api/auth/login` | Authenticates with email/password |
| POST | `/api/auth/validate` | Validates a Bearer token |

### Organization and agents

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/organization/companies` | Create a company (admin role decorator) |
| POST | `/api/organization/employees` | Create an employee (admin role decorator) |
| POST | `/api/organization/agents` | Create an agent (admin role decorator) |
| POST | `/api/organization/my-agents` | Create an agent for the current employee |
| GET | `/api/organization/my-agents` | List agents for the current employee |
| GET | `/api/organization/companies/:companyId/employees` | List company employees (admin role decorator) |
| GET | `/api/organization/companies/:companyId/agents` | List company agents (admin role decorator) |
| POST | `/api/departments` | Create a department (admin role decorator) |
| GET | `/api/departments/company/:companyId` | List departments for a company |
| POST | `/api/agents/chat` | Send a chat message to an agent |
| POST | `/api/agents/act` | Run an agent action/task |
| POST | `/api/agents/plan` | Request a tool plan from an agent |

Agent creation fields include role and optional system instructions/provider/model; consult the controller and service before depending on additional fields.

### Projects and tasks

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/projects` | Create a project in the current company |
| GET | `/api/projects` | List projects for the current company |
| GET | `/api/tasks` | List company tasks |
| GET | `/api/tasks/:id` | Get a task scoped to the current company |
| POST | `/api/tasks` | Create a task; may include project and assigned agent |
| PATCH | `/api/tasks/:id/status` | Update a task status |
| POST | `/api/tasks/:taskId/dependencies` | Add a task dependency |
| GET | `/api/tasks/:taskId/dependencies` | List task dependencies |

### Orchestration and collaboration

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/orchestrator/team-run` | Run the Coding/Testing/Documentation team workflow |
| POST | `/api/orchestrator/route` | Route a task to a suitable agent |
| POST | `/api/orchestrator/dispatch` | Dispatch work from one agent to another |
| POST | `/api/orchestrator/dispatch-and-run` | Dispatch and run delegated work |
| POST | `/api/collaboration/tasks` | Request delegated work |
| POST | `/api/collaboration/tasks/:taskId/respond` | Respond to a delegated task |
| GET | `/api/collaboration/tasks/:taskId` | Get a task and its messages |
| GET | `/api/collaboration/tasks/:taskId/results` | Read matching Redis response stream entries |
| GET | `/api/messages/task/:taskId` | List messages associated with a task |

Redis-backed results/streams require Redis to be enabled and reachable.

### Memory

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/memory/:agentId` | List an agent's memories; optional `scope` query |
| POST | `/api/memory` | Create a memory using `agentId`, `scope`, and `content` |
| DELETE | `/api/memory/:agentId/:id` | Delete a memory |
| POST | `/api/memory/:agentId/search` | Semantic search with `query`, optional `limit` and `scope` |

The current API embedding implementation uses OpenAI embeddings and requires `OPENAI_API_KEY`. See [Memory and Embeddings](MEMORY_AND_EMBEDDINGS.md).

### Approvals, audit and tools

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/approvals` | List approvals for the current context |
| POST | `/api/approvals` | Request an approval |
| PATCH | `/api/approvals/:id` | Approve or reject a pending approval |
| GET | `/api/audit/company/:companyId` | List audit records for a company |
| GET | `/api/tools` | List registered tools |
| POST | `/api/tools/request` | Request tool execution; may return a waiting-for-human state |
| POST | `/api/tools/approve/:executionId/:approvalId` | Approve and execute a linked tool execution |
| POST | `/api/tools/reject/:executionId/:approvalId` | Reject a linked tool execution |

Tool requests must go through server-side policy and approval checks. Never call a raw tool implementation directly from the browser.

### Devices and sandbox

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/devices/register` | Register a device for the current employee |
| GET | `/api/devices` | List the employee's devices |
| PATCH | `/api/devices/:id/revoke` | Revoke a device |
| POST | `/api/devices/:id/bind-agent` | Bind an agent to a device with optional permissions |
| POST | `/api/devices/:id/unbind-agent` | Remove an agent binding |
| POST | `/api/devices/:id/commands` | Request an allowed device command |
| POST | `/api/sandbox/execute` | Request sandbox execution for an owned agent |

### Real-time and other routes

The application also has a device WebSocket gateway and activity gateway. Their transport paths and authentication details should be verified in `apps/api/src/devices/device.gateway.ts` and `apps/api/src/activity/activity.gateway.ts` before writing a client integration.

## Python agent service

Base URL: `http://localhost:8000`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service status and names of configured providers (not key values) |
| POST | `/v1/agents/respond` | Run a text response for an agent request |
| POST | `/v1/agents/plan` | Produce a tool plan |
| POST | `/v1/agents/execute-task` | Execute delegated task work |
| POST | `/v1/memory/validate` | Validate whether proposed memory content is safe work memory |
| POST | `/v1/memory/retrieve` | Rank/retrieve supplied memory candidates |

The agent-service request models are defined in `apps/agent-service/app/models.py`. Do not expose the service publicly without network restrictions and authentication appropriate to the deployment.

## Sandbox worker

Base URL is configured with `SANDBOX_WORKER_URL` (example port 8010).

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Worker health |
| POST | `/execute` | Execute supported Python/Node code in a restricted container |

The worker's supported languages and execution limits are defined in `apps/sandbox-worker/app.py`.

## Examples

### Check API health

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

### Check agent-service health

```powershell
Invoke-RestMethod http://localhost:8000/health
```

### Team run request

The request shape is:

```json
{
  "message": "Build a task management web app with a clean responsive UI."
}
```

Send it to `POST http://localhost:3001/api/orchestrator/team-run` with the application's required authentication header. Do not paste real Bearer tokens into documentation or support chats.

## Errors and status interpretation

- `400`: request validation or required data is missing.
- `401`: authentication/token is missing or invalid.
- `403`: role, ownership, tenant or permission check rejected the operation.
- `404`: the URL/method may not map to a route, or a scoped resource may not exist.
- `503`: a required downstream service/provider is unavailable or not configured.
- `WAITING_FOR_HUMAN`: execution needs an approval decision; this is not a completed task.
- `SKIPPED`: a requested team stage has no matching configured specialist.

For exact error shapes, inspect NestJS exception handling and the relevant service.
