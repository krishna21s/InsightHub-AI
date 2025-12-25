from __future__ import annotations

import base64
import os
from typing import Any, Dict, Optional

import requests


class VisionModelError(RuntimeError):
    pass


# Same as your previous project: unified Ollama API endpoint + model id
OLLAMA_UNIFIED_URL = os.getenv("OLLAMA_UNIFIED_URL", "").strip()
OLLAMA_MODEL_ID = os.getenv(
    "OLLAMA_MODEL_ID",
    "redule26/huihui_ai_qwen2.5-vl-7b-abliterated",
).strip()

# Vision Tutor persona (we can tune later)
SYSTEM_PROTOCOL = (
    "You are 'Vision Tutor' inside InsightHub-AI. You can understand what the user is viewing "
    "in a screenshot (document pages, slides, diagrams, tables). "
    "Explain everything in very clear, student-friendly language.\n\n"
    "Rules:\n"
    "1) If a diagram/table/graph is visible, explain it step-by-step.\n"
    "2) If reference text is provided, stay grounded to it.\n"
    "3) If something is not present in screenshot or reference text, say so clearly.\n"
    "4) Keep output clean and readable.\n"
)


def _image_bytes_to_base64(image_bytes: bytes) -> str:
    # Keep original quality (accuracy-first). Strip any data-url logic; UploadFile gives raw bytes.
    return base64.b64encode(image_bytes).decode("utf-8")


def ask_vision_model(
    *,
    query: str,
    image_bytes: bytes,
    context_text: Optional[str] = None,
    timeout_seconds: int = 60,
) -> Dict[str, Any]:
    """
    Calls the unified Ollama /api/generate endpoint with an image + prompt.

    Returns: {"answer": str, "raw": dict}
    """
    if not OLLAMA_UNIFIED_URL:
        raise VisionModelError("Missing OLLAMA_UNIFIED_URL in environment")

    if not query or not query.strip():
        raise VisionModelError("Missing query")

    if not image_bytes:
        raise VisionModelError("Missing image bytes")

    prompt = query.strip()
    if context_text and context_text.strip():
        prompt = (
            f"{prompt}\n\n"
            f"REFERENCE TEXT (from selected documents):\n"
            f"{context_text.strip()}"
        )

    payload = {
        "model": OLLAMA_MODEL_ID,
        "prompt": prompt,
        "system": SYSTEM_PROTOCOL,
        "images": [_image_bytes_to_base64(image_bytes)],
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
    except requests.RequestException as e:
        raise VisionModelError(f"Failed to reach vision model: {e}") from e

    if resp.status_code != 200:
        raise VisionModelError(f"Vision model returned {resp.status_code}: {resp.text}")

    try:
        data = resp.json()
    except Exception as e:
        raise VisionModelError(f"Vision model returned invalid JSON: {e}") from e

    answer = (data.get("response") or "").strip()
    if not answer:
        answer = "I received the screenshot, but the vision model returned an empty response."

    return {"answer": answer, "raw": data}
