# AI Teammates

A multi-tenant SaaS where every employee gets a personal AI teammate that learns work context, collaborates with other agents, and operates under company permissions.

## Stack

- Next.js + TypeScript
- NestJS + TypeScript
- Python + FastAPI + CrewAI
- PostgreSQL + pgvector
- Redis + WebSocket
- Docker

## Principle

> The Agent learns the employee's work, not the employee.

## Architecture

Company -> Employees -> Personal Agents -> Tasks / Memory / Tools / Collaboration / Approvals / Audit

CrewAI is the runtime layer; company identity, tenancy, authorization, memory policy, tasks and audit are owned by this application.