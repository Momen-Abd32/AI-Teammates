import json
import os
import re
from dataclasses import dataclass
from typing import Callable
from urllib.request import Request, urlopen
from openai import OpenAI

class LLMNotConfigured(RuntimeError):
    pass

ProviderGenerator = Callable[[str, str, str, bool], str]

@dataclass(frozen=True)
class ProviderAdapter:
    """Vendor adapter used by the provider-neutral agent runtime.

    generate receives (system_prompt, user_prompt, model, json_mode). Keep
    credentials and vendor-specific request handling inside the adapter.
    """

    default_model: str
    generate: ProviderGenerator

def _openai_chat(system: str, user: str, model: str, json_mode: bool = False) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("OPENAI_API_KEY is not configured")
    kwargs = {"api_key": api_key}
    base_url = os.getenv("OPENAI_BASE_URL", "").strip()
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)
    response = client.responses.create(
        model=model,
        instructions=system,
        input=user,
        store=False,
        text={"format": {"type": "json_object"}} if json_mode else {"format": {"type": "text"}},
    )
    return (response.output_text or "").strip()

def _http_json(url: str, headers: dict[str, str], payload: dict) -> dict:
    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers={**headers, "content-type": "application/json"}, method="POST")
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))

def _anthropic_chat(system: str, user: str, model: str, json_mode: bool = False) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("ANTHROPIC_API_KEY is not configured")
    prompt = user
    if json_mode:
        prompt += "\nReturn ONLY valid JSON with no markdown fences."
    data = _http_json(
        "https://api.anthropic.com/v1/messages",
        {"x-api-key": api_key, "anthropic-version": "2023-06-01"},
        {"model": model, "max_tokens": 4096, "system": system, "messages": [{"role": "user", "content": prompt}]},
    )
    return "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text").strip()

def _gemini_chat(system: str, user: str, model: str, json_mode: bool = False) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("GEMINI_API_KEY is not configured")
    data = _http_json(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        {},
        {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0 if json_mode else 0.2, **({"responseMimeType": "application/json"} if json_mode else {})},
        },
    )
    return "".join(part.get("text", "") for part in data.get("candidates", [{}])[0].get("content", {}).get("parts", [])).strip()

# Add providers here, or register an adapter from an optional provider module.
# Agent and workflow code should only call chat_text/chat_json, never vendor SDKs.
PROVIDERS: dict[str, ProviderAdapter] = {
    "openai": ProviderAdapter(default_model="gpt-5.6-luna", generate=_openai_chat),
    "anthropic": ProviderAdapter(default_model="claude-sonnet-5-5", generate=_anthropic_chat),
    "gemini": ProviderAdapter(default_model="gemini-3.8-flash", generate=_gemini_chat),
}
# Compatibility mapping for existing imports and tests.
DEFAULT_MODELS = {name: adapter.default_model for name, adapter in PROVIDERS.items()}

def register_provider(name: str, adapter: ProviderAdapter) -> None:
    """Register or replace a provider without changing agent dispatch code."""
    key = name.strip().lower()
    if not re.fullmatch(r"[a-z][a-z0-9_-]*", key):
        raise ValueError("Provider names must start with a letter and contain only letters, numbers, '_' or '-'")
    if not adapter.default_model.strip() or not callable(adapter.generate):
        raise ValueError("Provider adapter requires a default model and a callable generator")
    PROVIDERS[key] = adapter
    DEFAULT_MODELS[key] = adapter.default_model

def _model(provider: str, model: str | None) -> str:
    adapter = PROVIDERS.get(provider)
    if adapter is None:
        raise ValueError(f"Unsupported AI provider: {provider}")
    return (model or os.getenv(f"{provider.upper()}_MODEL", "") or adapter.default_model).strip()

def chat_text(*, provider: str = "openai", model: str | None = None, system: str, user: str) -> str:
    provider = provider.strip().lower()
    adapter = PROVIDERS.get(provider)
    if adapter is None:
        raise ValueError(f"Unsupported AI provider: {provider}")
    try:
        return adapter.generate(system, user, _model(provider, model), False)
    except LLMNotConfigured:
        return f"[LLM_NOT_CONFIGURED] {provider}: {user[:500]}"

def chat_json(*, provider: str = "openai", model: str | None = None, system: str, user: str) -> dict:
    provider = provider.strip().lower()
    adapter = PROVIDERS.get(provider)
    if adapter is None:
        raise ValueError(f"Unsupported AI provider: {provider}")
    content = adapter.generate(system, user, _model(provider, model), True)
    return json.loads(content)
