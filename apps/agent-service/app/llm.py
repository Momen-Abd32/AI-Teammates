import json
import os
from openai import OpenAI

class LLMNotConfigured(RuntimeError):
    pass

def _client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("OPENAI_API_KEY is not configured")
    kwargs = {"api_key": api_key}
    base_url = os.getenv("OPENAI_BASE_URL", "").strip()
    if base_url:
        kwargs["base_url"] = base_url
    return OpenAI(**kwargs)

def _model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")

def chat_text(*, system: str, user: str) -> str:
    try:
        response = _client().chat.completions.create(
            model=_model(),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
        )
        content = response.choices[0].message.content
        return content.strip() if content else ""
    except LLMNotConfigured:
        return "[LLM_NOT_CONFIGURED] " + user[:500]

def chat_json(*, system: str, user: str) -> dict:
    response = _client().chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)
