# AI Teammates — Project Blueprint

## Product
Every employee has a personal AI teammate. Agents learn work context only, collaborate through an orchestrator, and operate under company policies.

## Security
The LLM never decides access. It requests access; the Permission Engine decides.
Memory scopes: PRIVATE, PROJECT, TEAM, COMPANY.
Sensitive actions require human approval.

## Core domains
Company, Department, Employee, Agent, Project, Task, Memory, Permission, Message, Approval, AuditLog, ToolExecution.

## Runtime
Next.js web -> NestJS API -> Python/FastAPI Agent Service -> CrewAI runtime.
PostgreSQL/pgvector stores application state and memory. Redis provides messaging/realtime coordination.

## Roadmap
Foundation -> Company/Employee -> Agents -> Memory -> Tasks -> Collaboration -> Approvals -> Tools/Sandbox -> Security/Evaluation -> Deployment.
