"""
Mode-specific text generation backed by the unified Ollama endpoint (no images).
"""

from __future__ import annotations

import os
from typing import Any, Dict

import requests


class ModeModelError(RuntimeError):
    pass


# Same endpoint and model setup as the vision service, but used for text-only prompts
OLLAMA_UNIFIED_URL = os.getenv("OLLAMA_UNIFIED_URL", "").strip()
OLLAMA_MODEL_ID = os.getenv(
    "OLLAMA_MODEL_ID",
    "redule26/huihui_ai_qwen2.5-vl-7b-abliterated",
).strip()

_MODE_SYSTEM_PROMPTS = {
    "student": (
        "You are 'Study Buddy' for Student mode. Document data will be provided in full. "
        "Explain the material in simple language, pull key takeaways, propose quick analogies, "
        "and generate 3 self-check questions. Stay grounded in the document text, avoid guessing, "
        "and invite the learner to ask follow-up questions about the document."
    ),
    "teacher": (
        "You are 'Lesson Planner' for Teacher mode. Document data will be provided in full. "
        "Produce a concise teaching outline: learning objectives, 3-4 explanation chunks, "
        "class activities, and a quick assessment idea. Keep it practical and tied to the document."
    ),
    "exam": (
        "You are 'Exam Coach' for Exam mode. Document data will be provided in full. "
        "Create an exam-focused guide: highlight must-know concepts, propose practice questions "
        "labelled as 2, 5, and 10 marks, list likely definitions, and add brief answering tips. "
        "Use only the document content; when something is missing, state that."
    ),
    "revision": (
        "You are 'Revision Buddy' for Revision mode. Document data will be provided in full. "
        "Compress the material into bullet-style flash notes, include formulas/definitions, and "
        "ask 3 rapid-fire recall questions. Keep wording tight and document-grounded."
    ),
    "practical": (
        "You are 'Practical Mentor' for Practical mode. Document data will be provided in full. "
        "Design hands-on tasks, step-by-step exercises, and small projects that directly use the "
        "document's information. Include materials/tools needed, expected outcomes, and quick "
        "checks for completion. Stay strictly grounded to the document content."
    ),
}


def _get_system_prompt(mode: str) -> str:
    return _MODE_SYSTEM_PROMPTS.get(
        mode,
        "You are a helpful tutor. Document data will be provided; stay grounded to it at all times.",
    )


def _trim_content(content: str, max_chars: int = 16000) -> str:
    flat = (content or "").strip()
    if len(flat) <= max_chars:
        return flat
    return flat[:max_chars] + "\n\n[truncated for length]"


def _ask_mode_model(
    *, mode: str, filename: str, document_text: str, timeout_seconds: int = 60
) -> str:
    if not OLLAMA_UNIFIED_URL:
        raise ModeModelError("Missing OLLAMA_UNIFIED_URL in environment")

    system_prompt = _get_system_prompt(mode)
    doc_blob = _trim_content(document_text)
    if not doc_blob:
        raise ModeModelError("Document text is empty")

    prompt = (
        f"Mode: {mode}\n"
        f"Document name: {filename}\n"
        "Task: produce the mode-specific guidance using only the document data below.\n"
        "Prefer short paragraphs and bullets.\n\n"
        "DOCUMENT DATA START\n"
        f"{doc_blob}\n"
        "DOCUMENT DATA END\n"
    )

    payload = {
        "model": OLLAMA_MODEL_ID,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "top_k": 40,
            "top_p": 0.9,
            "num_ctx": 4096,
            "max_tokens": 500,
        },
    }

    try:
        resp = requests.post(OLLAMA_UNIFIED_URL, json=payload, timeout=timeout_seconds)
    except requests.RequestException as e:
        raise ModeModelError(f"Failed to reach text model: {e}") from e

    if resp.status_code != 200:
        raise ModeModelError(f"Text model returned {resp.status_code}: {resp.text}")

    try:
        data = resp.json()
    except Exception as e:  # pylint: disable=broad-except
        raise ModeModelError(f"Text model returned invalid JSON: {e}") from e

    answer = (data.get("response") or "").strip()
    if not answer:
        raise ModeModelError("Text model returned an empty response")

    return answer


def generate_mode_explanation(mode: str, content: str, filename: str) -> Dict[str, Any]:
    """Generate mode-specific explanation via the unified text model."""

    try:
        answer = _ask_mode_model(mode=mode, filename=filename, document_text=content)
        source = "mode-llm"
    except ModeModelError as exc:  # keep fallback to avoid breaking UX
        fallback = _trim_content(content, max_chars=800)
        answer = (
            f"Mode response unavailable ({exc}). Fallback summary from document:\n"
            f"{fallback}"
        )
        source = "fallback"

    title_prefix = {
        "student": "Student Guide",
        "teacher": "Teaching Guide",
        "exam": "Exam Coach",
        "revision": "Quick Revision",
        "practical": "Practical Mentor",
    }.get(mode, "Document Guide")

    return {
        "title": f"{title_prefix}: {filename}",
        "summary": answer,
        "mode": mode,
        "source": source,
        "model_id": OLLAMA_MODEL_ID,
    }
