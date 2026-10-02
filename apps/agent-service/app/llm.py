import json
import os
from urllib.request import Request, urlopen
from openai import OpenAI

class LLMNotConfigured(RuntimeError):
    pass

DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-2.5-flash",
}

def _model(provider: str, model: str | None) -> str:
    return (model or os.getenv(f"{provider.upper()}_MODEL", "") or DEFAULT_MODELS[provider]).strip()

def _openai_chat(system: str, user: str, model: str, json_mode: bool = False) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("OPENAI_API_KEY is not configured")
    kwargs = {"api_key": api_key}
    base_url = os.getenv("OPENAI_BASE_URL", "").strip()
    if base_url:
        kwargs["base_url"] = base_url
    client = OpenAI(**kwargs)
    params = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0 if json_mode else 0.2,
    }
    if json_mode:
        params["response_format"] = {"type": "json_object"}
    response = client.chat.completions.create(**params)
    return (response.choices[0].message.content or "").strip()

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

def chat_text(*, provider: str = "openai", model: str | None = None, system: str, user: str) -> str:
    provider = provider.strip().lower()
    if provider not in DEFAULT_MODELS:
        raise ValueError(f"Unsupported AI provider: {provider}")
    try:
        selected = _model(provider, model)
        if provider == "openai":
            return _openai_chat(system, user, selected)
        if provider == "anthropic":
            return _anthropic_chat(system, user, selected)
        return _gemini_chat(system, user, selected)
    except LLMNotConfigured:
        return f"[LLM_NOT_CONFIGURED] {provider}: {user[:500]}"

def chat_json(*, provider: str = "openai", model: str | None = None, system: str, user: str) -> dict:
    provider = provider.strip().lower()
    if provider not in DEFAULT_MODELS:
        raise ValueError(f"Unsupported AI provider: {provider}")
    selected = _model(provider, model)
    if provider == "openai":
        content = _openai_chat(system, user, selected, True)
    elif provider == "anthropic":
        content = _anthropic_chat(system, user, selected, True)
    else:
        content = _gemini_chat(system, user, selected, True)
    return json.loads(content)
