# Agent Service

Python/FastAPI runtime for the workspace's personal AI teammates. Authorization remains owned by the API/Permission Engine.

## Multi-model providers

Each agent can select its own provider and model:

| Standard role | Provider | Default model |
|---|---|---|
| Coding Agent | Anthropic / Claude | `claude-sonnet-5-5` |
| Testing Agent | OpenAI / ChatGPT API | `gpt-6-luna` |
| Documentation Agent | Google / Gemini | `gemini-3.8-flash` |

The provider/model travels from the organization API to the agent service for both normal responses and tool planning. Custom agents can override the provider and model from the UI or API.

## Environment

Set the provider API keys on the server running this service:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5-5

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

API keys must stay server-side; never put them in the web app.

If a provider key is missing, normal text generation returns a `[LLM_NOT_CONFIGURED]` marker instead of exposing the secret or crashing the request. Structured tool planning fails closed to `NONE`.

## Local provider tests

Run the provider routing tests without making network calls:

```bash
PYTHONPATH=apps/agent-service python -m unittest discover -s apps/agent-service/tests -p 'test_*.py'
```
