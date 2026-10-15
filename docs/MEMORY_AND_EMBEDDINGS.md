# Memory and Embeddings

## 1. Purpose

Memory allows an agent to retain relevant work context beyond a single prompt. AI Teammates models memory as scoped work information, applies policy checks and supports semantic retrieval through vector embeddings.

Memory must not be used as a store for unrelated private employee information, credentials, passwords, API keys or access tokens.

## 2. Current implementation

The API memory area is under `apps/api/src/memory` and includes:

- `memory.controller.ts` — HTTP endpoints.
- `memory.service.ts` — memory business logic and scope handling.
- `memory.repository.ts` and the shared memory repository — persistence.
- `embedding.service.ts` — text-to-vector provider call.
- `memory-learning.service.ts` — learning-related behavior.

The Python runtime also has memory helper modules for ranking/retrieval and safe work-memory checks. These are related but should not be assumed to replace API-side persistence.

## 3. Memory scopes and ownership

The platform blueprint defines scopes such as PRIVATE, PROJECT, TEAM and COMPANY. The service and database are the source of truth for exact validation and access rules. A caller should never be allowed to query another employee's private memory merely by changing an agent ID or scope in a request.

Before changing scope behavior, review the API memory service, repository queries, tenant context and tests together.

## 4. Semantic embeddings

The current API embedding service:

1. Trims input and rejects an empty string.
2. Reads `OPENAI_API_KEY`.
3. Calls `https://api.openai.com/v1/embeddings`.
4. Uses `EMBEDDING_MODEL` or defaults to `text-embedding-3-small`.
5. requests a 1536-dimensional vector.
6. Rejects provider failures or an unexpected vector length.

The implementation throws `Memory embeddings are not configured` when the API process cannot read an OpenAI key. A key that exists in a file but was not loaded into the API process is equivalent to a missing key.

## 5. Configuration and cost

Add a valid key to the local `.env` without sharing it:

```env
OPENAI_API_KEY=your_real_key_here
EMBEDDING_MODEL=text-embedding-3-small
```

The placeholder above is illustrative; never use the text `your_real_key_here` as an actual credential. API usage is billed separately from a ChatGPT subscription and is subject to the provider's account limits/pricing.

After changing `.env`, restart the API process. If the API is started by a container, configure the environment in that container and recreate/restart it. Do not print the secret to verify it; check only whether the variable is present.

## 6. Failure modes

| Symptom | Likely cause | Check |
|---|---|---|
| `Memory embeddings are not configured` | `OPENAI_API_KEY` missing from API process | Check presence without printing value, then restart API |
| Embedding provider error (401/403) | Invalid key or account access | Verify key status with provider; do not paste key into logs |
| Embedding provider error (429) | Rate limit or quota/billing issue | Check provider account and usage |
| Invalid vector | Model/response does not match expected 1536 dimensions | Check `EMBEDDING_MODEL` compatibility with code/schema |
| Request times out | Network/provider delay | Check connectivity and provider status |

## 7. Operational guidance

- Treat embeddings as an external API dependency.
- Apply request limits and handle provider outages gracefully.
- Never log raw credentials.
- Ensure vector column dimensions match the configured embedding output.
- Test tenant isolation and private-memory boundaries.
- Decide retention/deletion policies before production.
- Avoid assuming that successful database health means embeddings work; health currently checks the database and Redis status, not a live embedding request.

## 8. Future hardening

Potential follow-up work includes provider abstraction for embeddings, retry/backoff with a strict budget, explicit readiness checks, cost/usage monitoring, data retention controls, and automated tests for provider failures and vector dimension mismatches. These are recommendations, not claims that all are currently implemented.
