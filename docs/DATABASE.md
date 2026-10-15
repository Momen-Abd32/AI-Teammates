# Database and Migrations

## 1. Database role

PostgreSQL is the main persistent store for company/employee context, agents, projects, tasks, conversations/messages, memory, approvals, tool executions, devices, audit records and associated metadata. pgvector supports similarity search for memory embeddings.

## 2. Source files

- `infrastructure/postgres/schema.sql` — baseline schema.
- `infrastructure/postgres/migrations/` — incremental schema changes.
- `infrastructure/postgres/README.md` — short infrastructure note.

Migrations currently include workspace/auth, tools, agent runs, multi-agent devices, task context, device execution hardening and agent provider/model assignments. Always inspect the current migration list before changing schema.

## 3. Local setup

1. Install PostgreSQL and ensure pgvector is available to the server.
2. Create a database matching `DATABASE_URL`, commonly `ai_teammates`.
3. Apply the baseline schema for a new local database:

```powershell
psql -U postgres -d ai_teammates -f .\infrastructure\postgres\schema.sql
```

4. Apply migrations that are required by the current repository and not already applied. Follow the migration README and inspect the SQL before executing it.
5. Verify connectivity through `GET /api/health`.

Do not blindly reapply a migration to a database with real data unless it is designed to be safely repeatable. Back up first.

## 4. Migration discipline

- Keep schema changes as SQL migrations committed with the corresponding code.
- Prefer additive migrations and explicit backfills over manual production edits.
- Do not rely on a developer's local-only `ALTER TABLE` as the sole record of a required schema change.
- Test both a clean database setup and an upgrade from the previous supported schema.
- Keep indexes, constraints and vector dimensions aligned with repository code.
- Record rollback considerations for destructive changes.

## 5. Tenant isolation

Tenant/company identifiers appear across core domain records. Queries for company-owned resources should include company scope, and private agent/memory access should include employee ownership as appropriate. New repository methods must not accept an arbitrary ID and return a record without checking the caller's tenant/ownership.

Review both service-level authorization and repository filters. Tests should cover cross-company and cross-employee access attempts.

## 6. Task and run records

Tasks and agent runs are related but not interchangeable. Tasks describe requested work and lifecycle; agent runs represent execution attempts/context. The schema contains task context on agent runs through migrations. Keep task/run status transitions consistent when adding retries, approval pauses or delegated work.

## 7. Vector memory

The embedding service currently requests vectors with 1536 dimensions. The corresponding database vector column and similarity queries must use compatible dimensions. Changing the embedding model or dimensionality requires a planned schema/data migration and re-embedding strategy, not just an environment variable change.

## 8. Backup and recovery

Before production:
- Configure scheduled encrypted backups.
- Define recovery point and recovery time objectives.
- Test restoration into an isolated environment.
- Include PostgreSQL data and required configuration/secrets recovery procedures.
- Monitor storage, connection saturation, failed migrations and query performance.

Backups and restore automation are production requirements, not assumed to exist just because PostgreSQL is configured.
