from __future__ import annotations

import io
import re
from dataclasses import dataclass
from typing import List, Tuple

from PIL import Image

from services.session_store import DocumentData


@dataclass
class MatchedPage:
    doc_id: str
    filename: str
    page_index: int
    score: float
    snippet: str


_WORD_RE = re.compile(r"[a-zA-Z0-9]{3,}")


def _normalize_words(text: str) -> List[str]:
    text = (text or "").lower()
    return _WORD_RE.findall(text)


def _keyword_overlap_score(a_words: List[str], b_words: List[str]) -> float:
    """
    Simple scoring: overlap ratio based on unique terms.
    Works fine for MVP; later we can use embeddings.
    """
    a_set = set(a_words)
    b_set = set(b_words)
    if not a_set or not b_set:
        return 0.0
    inter = len(a_set.intersection(b_set))
    union = len(a_set.union(b_set))
    return inter / union


def ocr_image_to_text(image_bytes: bytes) -> str:
    """
    OCR screenshot to get visible text.
    Requires: pytesseract + system tesseract installed.
    """
    try:
        import pytesseract
    except Exception as e:
        raise RuntimeError(
            "pytesseract is not installed. Install it and ensure tesseract is available on system."
        ) from e

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    try:
        return pytesseract.image_to_string(img) or ""
    except Exception:
        return ""


def match_pages_by_screenshot(
    *,
    image_bytes: bytes,
    selected_docs: List[DocumentData],
    top_k: int = 4,
    snippet_chars: int = 1400,
) -> Tuple[str, List[MatchedPage]]:
    """
    Returns:
      (context_text, matched_pages)

    Strategy:
      1) OCR screenshot -> ocr_text
      2) Score each page in selected docs by keyword overlap
      3) Select top_k pages and concatenate snippets as context_text
    """
    ocr_text = ocr_image_to_text(image_bytes)
    ocr_words = _normalize_words(ocr_text)

    scored: List[MatchedPage] = []

    for doc in selected_docs:
        for page in doc.pages:
            page_words = _normalize_words(page.text)
            score = _keyword_overlap_score(ocr_words, page_words)
            if score <= 0:
                continue
            snippet = (page.text or "")[:snippet_chars]
            scored.append(
                MatchedPage(
                    doc_id=doc.doc_id,
                    filename=doc.filename,
                    page_index=page.index,
                    score=float(score),
                    snippet=snippet,
                )
            )

    scored.sort(key=lambda x: x.score, reverse=True)
    top = scored[:top_k]

    # Build context text (text-only, as you requested)
    parts: List[str] = []
    for m in top:
        parts.append(
            f"[{m.filename} | page/part {m.page_index + 1} | score={m.score:.3f}]\n{m.snippet}"
        )

    context_text = "\n\n---\n\n".join(parts).strip()
    return context_text, top