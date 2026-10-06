# AI Teammates — Submission Guide

## 1. What the project delivers

AI Teammates is a multi-tenant AI workforce platform in which one employee can have multiple specialized AI teammates on the same physical device.

The reference team is:
- Coding Agent — implementation and repository work
- Testing Agent — verification and test-focused work
- Documentation Agent — documentation and knowledge work

Each agent has its own identity, model/provider, permissions, conversations, memory namespace and execution history.

## 2. Main architecture

Next.js Web -> NestJS API -> Python/FastAPI Agent Service -> Tool Policy / Approval -> Device Gateway -> Desktop Agent

Supporting infrastructure:
- PostgreSQL + pgvector for application state and work memory
- Redis for coordination and runtime messaging
- Sandbox worker for isolated code execution
- GitHub integration for repository tools

## 3. Security model

The LLM does not directly grant itself permissions.

1. The planner proposes an action.
2. The NestJS policy layer checks the agent, employee and company permissions.
3. Sensitive tools create an approval request.
4. The employee approves or rejects the action.
5. Approved device actions are checked again against the bound-device policy.
6. Audit/activity events record important execution steps.

The desktop runtime additionally applies workspace confinement, command allowlists, timeouts and output/file-size limits.

## 4. Demo flow

### A. Start infrastructure

Copy .env.example to .env, set a strong AUTH_SECRET, and configure at least one supported AI provider key/model.

~~~bash
docker compose up -d postgres redis
~~~

### B. Start services

Run the API, web app and Python agent service from their respective workspaces, or use the Docker Compose services for the backend stack.

### C. Create a workspace

Open the web application and choose Create workspace. The first account becomes the company administrator.

### D. Create the AI team

Open My Agent and create the specialized agents. Assign the desired provider/model to each agent.

Recommended demonstration:
- Coding Agent -> Anthropic
- Testing Agent -> OpenAI
- Documentation Agent -> Gemini

### E. Demonstrate collaboration

Send a work request with Auto-route enabled. The orchestrator creates/assigns a task to an appropriate teammate. Follow the lifecycle through Tasks and Collaboration.

### F. Demonstrate human approval

Ask an agent to perform a sensitive operation such as writing to a repository or executing a device command. The system pauses the run and creates an approval request. Approve or reject it from Approvals.

### G. Demonstrate same-device execution

Register a device, bind the relevant agent, start the desktop-agent runtime, and enable only the required local actions.

The desktop runtime receives commands containing the target agentId and applies both global and agent-specific policies.

## 5. Validation

GitHub Actions validates the integrated repository on pushes to main and pull requests:
- API TypeScript validation
- API Jest tests
- Web TypeScript validation
- Desktop-agent build
- API build
- Web production build
- Python syntax checks
- Agent-service provider tests
- Docker Compose validation

The latest validated main commit has a successful CI run.

## 6. Important environment settings

Required for a real AI run:
- AUTH_SECRET
- At least one provider key: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY

For the local desktop runtime:
- DEVICE_WS_URL
- DEVICE_TOKEN
- DEVICE_WORKSPACE
- DEVICE_ALLOWED_ACTIONS

For browser/screenshot capabilities:
- DEVICE_BROWSER_CDP_URL

For GitHub tools:
- GITHUB_TOKEN
- optionally GITHUB_ALLOWED_REPOS

## 7. Submission checklist

- [x] Authentication and company workspace creation
- [x] Multi-agent creation and model/provider assignment
- [x] Agent conversations and memory
- [x] Task management and orchestration
- [x] Agent-to-agent delegation
- [x] Tool registry and permission policy
- [x] Human approval flow
- [x] Audit/activity tracking
- [x] Same-device agent runtime
- [x] Device binding and local policy
- [x] Sandboxed terminal execution
- [x] GitHub repository tools
- [x] CI validation
- [x] Docker Compose infrastructure
- [x] Submission documentation
- [x] Production-style landing page

## 8. Known scope boundary

This is a complete academic/MVP submission build. Production enterprise rollout would additionally require managed secrets, centralized observability, automated database backup/restore, external identity providers where required, hardened OS-level sandboxing for device execution, and a deployed real-device/browser test environment.
