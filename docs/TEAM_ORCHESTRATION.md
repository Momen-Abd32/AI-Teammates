# Team Chat and Agent Orchestration

## 1. Overview

The Team page provides a single request interface. The API's `TeamOrchestratorService` coordinates a sequence of specialist roles and records each stage as a task. The current workflow is a bounded sequential pipeline, not an unrestricted swarm and not an infinite self-correcting loop.

Primary endpoint: `POST /api/orchestrator/team-run`.

## 2. Request contract

The controller accepts a JSON body with:

- `message` — required user request.
- `projectId` — optional project context.

The API supplies the authenticated `companyId` and `employeeId`; clients should not be trusted to choose another tenant's identity.

An empty/whitespace message is rejected. If a project ID is provided, it must resolve within the current company.

## 3. Eligible agents

The orchestrator considers agents returned for the current employee and company. An agent must have both permissions:

- `agent.chat`
- `agent.collaborate`

Agents lacking either permission are excluded from the team workflow.

A user-facing message such as “Add AI teammates in My Agents first” means there is no eligible agent with the required permissions; it does not necessarily mean the database has zero agent records.

## 4. Stage roles

The current stages are:

| Stage | Role matching | Purpose |
|---|---|---|
| Coding | coding, developer, software engineer, full-stack, frontend, backend, programmer | Inspect and implement the requested change in the shared workspace |
| Testing | testing, tester, quality assurance, QA, test engineer | Validate work and report commands/results without changing app code unless fixes were requested |
| Documentation | documentation, technical writer, docs, README | Prepare/update accurate documentation based on actual files and verification |

Role matching checks the agent's role plus system instructions. Use clear role names and specific instructions when creating agents.

## 5. Stage selection

The orchestrator inspects the request text for terms associated with coding, testing and documentation.

- Requests that appear to build/implement/develop/fix/refactor/create software normally request Coding, Testing and Documentation.
- Requests explicitly about testing can request Testing alone.
- Requests explicitly about docs can request Documentation alone.
- Requests combining testing and documentation can request those stages without Coding.

This is heuristic routing based on text patterns, not a general-purpose semantic planner. When routing matters, phrase the request clearly.

## 6. Execution sequence

For each selected stage:

1. Find the first eligible agent whose role/instructions match the stage.
2. If none exists, record the stage as `SKIPPED` with a reason.
3. If an earlier stage blocked the workflow, record later stages as `BLOCKED`.
4. Create a task assigned to the chosen agent.
5. Send the original user request, stage-specific instructions and previous stage output to the agent.
6. Record the returned status and response.
7. If the stage fails, reaches a step limit, or waits for human approval, later stages are blocked.

The orchestrator does not claim that code was changed merely because an agent responded; the coding instructions explicitly require the agent to report verified changes and blockers.

## 7. Bounded repair behavior

The current service includes one bounded repair path when Testing reports failure: it may send the reported failures to a separate Coding specialist and ask Testing to rerun once. This is deliberately bounded to avoid indefinite loops. It is not a guarantee that all test failures will be fixed, and it depends on having a separate eligible Coding agent.

## 8. Status meanings

| Status | Meaning |
|---|---|
| `COMPLETED` | Stage reports completion |
| `FAILED` | Stage failed |
| `WAITING_FOR_HUMAN` | Stage needs approval before continuing |
| `STEP_LIMIT_REACHED` | Agent reached its execution limit |
| `SKIPPED` | No matching specialist was configured |
| `BLOCKED` | An earlier stage prevents this stage from running |

Exact statuses can also originate from the agent runtime. The UI should display the status returned by the API rather than infer success from a successful HTTP response alone.

## 9. Why a single-agent setup is insufficient

If only a Coding agent exists, Coding may run, but Testing and Documentation will be skipped because the orchestrator does not silently reuse an unrelated specialist. To get the full workflow, create distinct agents with role names matching each stage and ensure each has the required collaboration permissions.

Recommended initial roster:

- Coding Agent — implements code in the shared workspace.
- Testing Agent — reviews and executes allowed tests.
- Documentation Agent — updates docs and clearly distinguishes verified facts from assumptions.

Provider credentials and model access must also be configured for each selected agent.

## 10. Current limitations

- Stage selection is rule-based and sequential.
- Role selection uses regular-expression matching against role and instructions.
- The workflow does not guarantee a shared writable project workspace unless the relevant device/runtime integration is configured.
- Missing agents are skipped rather than created automatically.
- Repair is bounded.
- Provider/model, embeddings, permissions, tool availability and human approvals can still stop execution.
- Team chat messages in the current web page may be session-local even though task records are persisted by the API; consult the page implementation before assuming chat transcript persistence.

## 11. Troubleshooting

- `No ... specialist found`: add an agent with a matching role.
- `Memory embeddings are not configured`: set a valid `OPENAI_API_KEY` for the API process and restart it.
- Provider not configured: configure the key for the agent's selected provider.
- Waiting for human: open Approvals and decide the pending request.
- Workspace files do not change: verify that the agent is using the intended workspace/device or sandbox path and that tool permissions allow the requested operation.

See [Configuration](CONFIGURATION.md), [Memory and Embeddings](MEMORY_AND_EMBEDDINGS.md), and [Troubleshooting](TROUBLESHOOTING.md).
