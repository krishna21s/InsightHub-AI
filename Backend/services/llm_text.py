from __future__ import annotations

import os
from typing import Any, Dict, Optional

import requests


class LLMTextError(RuntimeError):
    pass


OLLAMA_UNIFIED_URL = os.getenv("OLLAMA_UNIFIED_URL", "").strip()
OLLAMA_MODEL_ID = os.getenv(
    "OLLAMA_MODEL_ID",
    "redule26/huihui_ai_qwen2.5-vl-7b-abliterated",
).strip()

_DEFAULT_SYSTEM = "You are a concise, accurate tutor. Keep answers short and grounded to the provided question/context."


def ask_llm_text(
    *, query: str, system_hint: Optional[str] = None, timeout_seconds: int = 60
) -> Dict[str, Any]:
    """Send a text-only prompt to the unified Ollama endpoint."""
    if not OLLAMA_UNIFIED_URL:
        raise LLMTextError("Missing OLLAMA_UNIFIED_URL in environment")
    if not query or not query.strip():
        raise LLMTextError("Missing query")

    payload = {
        "model": OLLAMA_MODEL_ID,
        "prompt": query.strip(),
        "system": (system_hint or _DEFAULT_SYSTEM).strip(),
        "stream": False,
        "options": {
            "temperature": 0.3,
            "top_k": 40,
            "top_p": 0.9,
            "num_ctx": 4096,
            "max_tokens": 400,
        },
    }

    try:
        resp = requests.post(OLLAMA_UNIFIED_URL, json=payload, timeout=timeout_seconds)
    except requests.RequestException as e:  # network / connection issues
        raise LLMTextError(f"Failed to reach text model: {e}") from e

    if resp.status_code != 200:
        raise LLMTextError(f"Text model returned {resp.status_code}: {resp.text}")

    try:
        data = resp.json()
    except Exception as e:  # invalid JSON
        raise LLMTextError(f"Text model returned invalid JSON: {e}") from e

    answer = (data.get("response") or "").strip()
    if not answer:
        raise LLMTextError("Text model returned an empty response")

    return {"answer": answer, "raw": data}
