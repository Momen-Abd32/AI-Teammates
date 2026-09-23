# Testing Strategy
- Unit: services, policies, task transitions, and memory rules.
- Integration: PostgreSQL repositories, Redis streams, and API endpoints.
- Security: tenant isolation, permission denial, private-memory leakage, and prompt injection.
- Agent: delegation, task completion, and human approval.
- E2E: login -> personal agent -> task -> collaboration -> approval -> completion.
- AI evaluation: groundedness, instruction hierarchy, and unsafe-memory rejection.
