# AI Teammates — Product Evolution Principles

## Product direction

AI Teammates is a general-purpose AI workforce for people and teams, not a developer-only coding assistant. A user should be able to describe an outcome in ordinary language without needing to understand agents, models, prompts, tools, or workflows.

The product must support both:
- **Guided mode:** task-oriented entry points and reusable workflows for non-technical roles.
- **Advanced mode:** explicit control over agents, models, skills, tools, permissions, and workflow details for technical users.

## Non-developer work domains

The product architecture and user experience should accommodate administration, operations, HR, marketing and sales, customer support, research, reporting, and technical work. These are product targets, not a claim that every domain is implemented today. A workflow should only be shown as executable when its required skills, integrations, permissions, and tests exist.

## AI extensibility principles

1. **Provider-neutral core.** Agent orchestration, memory, workflow state, and permissions must not depend on a single model vendor.
2. **Adapter contract.** Providers implement a small shared contract for text generation and structured output. Adding a provider should mean implementing and registering an adapter, not editing every agent or workflow.
3. **Model configuration is data.** Provider and model choices remain configuration associated with an agent or task; credentials remain server-side environment/secrets and never enter browser code or source control.
4. **Capabilities are separate from models.** Skills/tools expose typed inputs, outputs, permissions, and approval requirements. A model can propose a skill call, but the API policy layer decides whether it may run.
5. **Workflow templates are reusable.** A department-specific workflow should compose shared skills and agent roles instead of duplicating provider logic.
6. **Fail safely and visibly.** Missing credentials, unsupported providers, malformed structured output, and provider errors must produce explicit task states. The system must not pretend a request completed or silently substitute a fake result.
7. **Test without paid APIs.** Provider routing, configuration, error handling, and orchestration should be covered by deterministic offline tests; live-provider checks are separate and opt-in.
8. **Observe cost and quality.** Provider/model changes should be measurable by latency, errors, estimated cost when available, and task-level evaluation results.

## Target architecture boundaries

- **Web experience:** task-oriented guided workspace plus advanced controls.
- **Workflow/orchestrator:** turns a user goal into validated steps and delegates work.
- **Agent runtime:** executes model reasoning through the provider contract.
- **Provider adapters:** translate the shared contract to each vendor API.
- **Skills and integrations:** bounded capabilities with schemas and permissions.
- **Policy and approvals:** authoritative enforcement outside the model.
- **Memory and workspace context:** scoped to the employee, team, project, and company according to policy.
- **Evaluation and observability:** offline tests and runtime traces for workflows and provider calls.

## Delivery sequence

1. Establish and test a provider registry/adapter contract without changing existing API routes.
2. Make provider configuration and failure states explicit and predictable.
3. Define a typed skill catalog and reusable workflow template format.
4. Add one end-to-end non-technical workflow using existing safe capabilities before advertising additional departments.
5. Update the guided workspace so users can describe goals without choosing a model or agent first.
6. Add more role templates only with integration tests and clear permission boundaries.

## Definition of done for future AI features

A new provider, skill, or workflow is not considered complete until it has: configuration documentation, deterministic tests, explicit permission behavior, failure handling, and a user-visible status that distinguishes success, failure, and waiting for approval.