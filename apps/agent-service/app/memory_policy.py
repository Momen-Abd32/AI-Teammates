from typing import Literal

MemoryScope = Literal["PRIVATE", "PROJECT", "TEAM", "COMPANY"]

FORBIDDEN_TERMS = {
    "password",
    "api key",
    "apikey",
    "secret",
    "private key",
    "credit card",
}

def is_safe_work_memory(content: str) -> bool:
    text = content.lower()
    return not any(term in text for term in FORBIDDEN_TERMS)
