from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from services.doc_extract import DocumentExtractionError, extract_pages
from services.vision_model import VisionModelError, ask_vision_model
from services.session_store import SESSION_STORE
from services.mode_execute import generate_mode_explanation
from services.llm_text import LLMTextError, ask_llm_text
import fitz  # PyMuPDF for image extraction

router = APIRouter()


@router.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """
    Debug endpoint to check session status and documents.
    """
    session = SESSION_STORE.get(session_id)
    if not session:
        return {
            "session_exists": False,
            "session_id": session_id,
            "documents": [],
            "message": "No session found with this ID",
        }

    return {
        "session_exists": True,
        "session_id": session_id,
        "document_count": len(session.documents),
        "documents": [
            {
                "doc_id": d.doc_id,
                "filename": d.filename,
                "doc_type": d.doc_type,
                "page_count": len(d.pages),
            }
            for d in session.documents.values()
        ],
    }


@router.post("/process-mode")
async def process_mode(
    mode: str = Form(...),
    session_id: str = Form(...),
):
    """
    API endpoint to process modes such as Student, Teacher, Exam, and Revision.

    Processes documents already uploaded in the session:
    - Extracts text from all pages
    - Detects and analyzes images/diagrams using Vision Tutor
    - Generates mode-specific explanations
    """
    if mode not in {"student", "teacher", "exam", "revision", "practical"}:
        raise HTTPException(status_code=400, detail="Unsupported mode")

    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    # Get session documents
    session = SESSION_STORE.get(session_id)
    if not session or not session.documents:
        raise HTTPException(
            status_code=400,
            detail="No documents found in session. Please upload documents first.",
        )

    results = []

    for doc_id, doc_data in session.documents.items():
        filename = doc_data.filename
        doc_type = doc_data.doc_type
        pages = doc_data.pages

        mode_result = []
        all_text = []

        # Process each page
        for page in pages:
            text_content = page.text
            all_text.append(text_content)

            mode_result.append(
                {
                    "page_index": page.index,
                    "text": text_content,
                }
            )

        # Generate mode-specific explanation for the entire document
        combined_text = "\n\n".join(all_text)
        mode_explanation = generate_mode_explanation(mode, combined_text, filename)

        results.append(
            {
                "filename": filename,
                "doc_type": doc_type,
                "page_count": len(pages),
                "pages": mode_result,
                "mode_explanation": mode_explanation,
            }
        )

    return {"mode": mode, "session_id": session_id, "results": results}


@router.post("/process-mode-with-vision")
async def process_mode_with_vision(
    mode: str = Form(...),
    session_id: str = Form(...),
    files: List[UploadFile] = File(...),
):
    """
    Process mode with vision analysis for images and diagrams.
    This endpoint receives the actual file content to extract images.
    """
    if mode not in {"student", "teacher", "exam", "revision", "practical"}:
        raise HTTPException(status_code=400, detail="Unsupported mode")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []

    for uploaded_file in files:
        filename = uploaded_file.filename
        content = await uploaded_file.read()

        if not content:
            raise HTTPException(status_code=400, detail=f"File {filename} is empty")

        try:
            doc_type, pages = extract_pages(filename=filename, content=content)
        except DocumentExtractionError as e:
            raise HTTPException(status_code=400, detail=str(e))

        mode_result = []
        all_text = []
        vision_analyses = []

        # Extract images from PDF for vision analysis
        images_data = []
        if doc_type == "pdf":
            try:
                images_data = extract_images_from_pdf(content)
            except Exception as e:
                print(f"Error extracting images: {e}")

        # Process pages for the given mode
        for page in pages:
            text_content = page.text
            all_text.append(text_content)

            mode_result.append(
                {
                    "page_index": page.index,
                    "text": text_content,
                }
            )

        # Analyze images with Vision Tutor if any found
        for img_data in images_data:
            try:
                vision_result = ask_vision_model(
                    query=f"Analyze this diagram or image from the document. Explain what it shows and how it relates to the learning content in {mode} mode.",
                    image_bytes=img_data["bytes"],
                    context_text="\n".join(all_text[:3]),  # First few pages context
                )
                vision_analyses.append(
                    {
                        "page_index": img_data["page"],
                        "analysis": vision_result["answer"],
                    }
                )
            except VisionModelError as e:
                vision_analyses.append(
                    {
                        "page_index": img_data["page"],
                        "analysis": f"Vision analysis unavailable: {str(e)}",
                    }
                )

        # Generate mode-specific explanation
        combined_text = "\n\n".join(all_text)
        mode_explanation = generate_mode_explanation(mode, combined_text, filename)

        results.append(
            {
                "filename": filename,
                "doc_type": doc_type,
                "page_count": len(pages),
                "pages": mode_result,
                "mode_explanation": mode_explanation,
                "vision_analyses": vision_analyses,
                "has_images": len(images_data) > 0,
            }
        )

    return {"mode": mode, "session_id": session_id, "results": results}


def extract_images_from_pdf(pdf_content: bytes) -> List[dict]:
    """Extract images from PDF using PyMuPDF"""
    images = []
    try:
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")

        for page_num in range(len(pdf_document)):
            page = pdf_document[page_num]
            image_list = page.get_images(full=True)

            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = pdf_document.extract_image(xref)
                image_bytes = base_image["image"]

                # Only include reasonably sized images (filter out small icons)
                if len(image_bytes) > 5000:  # At least 5KB
                    images.append(
                        {
                            "page": page_num,
                            "bytes": image_bytes,
                        }
                    )

        pdf_document.close()
    except Exception as e:
        print(f"Error in image extraction: {e}")

    return images


@router.post("/ask")
async def ask_mode_question(
    session_id: str = Form(...),
    question: str = Form(...),
    doc_id: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
):
    """
    Lightweight QA over already-processed documents (no external LLM).

    - Looks up session documents
    - Finds best matching page text by keyword overlap
    - Returns a snippet and metadata
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Missing question")

    session = SESSION_STORE.get(session_id)
    if not session or not session.documents:
        raise HTTPException(
            status_code=400,
            detail="No documents found in session. Upload and process first.",
        )

    # choose documents to search
    documents = (
        [session.documents[doc_id]]
        if doc_id and doc_id in session.documents
        else list(session.documents.values())
    )

    q_words = _tokenize(question)
    hits = []

    for doc in documents:
        for page in doc.pages:
            text = page.text or ""
            score = _overlap_score(q_words, _tokenize(text))
            if score == 0:
                continue
            snippet = text[:800] + ("..." if len(text) > 800 else "")
            hits.append(
                {
                    "doc_id": doc.doc_id,
                    "filename": doc.filename,
                    "doc_type": doc.doc_type,
                    "page_index": page.index,
                    "score": score,
                    "snippet": snippet,
                }
            )

    if not hits:
        # No matching passage found in uploaded documents -> treat as unrelated
        # Fallback to LLM to answer concisely with bullet points
        try:
            llm = ask_llm_text(
                query=question.strip(),
                system_hint=(
                    "You are a helpful tutor. Respond in short, clear bullet points only."
                ),
            )
            bullets = _to_bullets(llm.get("answer", ""), max_items=4)
            return {
                "session_id": session_id,
                "mode": mode,
                "answer": bullets,
                "hits": [],
                "source": "llm-fallback",
            }
        except LLMTextError as e:
            return {
                "session_id": session_id,
                "mode": mode,
                "answer": "No document match and LLM unavailable.",
                "hits": [],
                "error": str(e),
            }

    # keep top 3 by score descending
    hits.sort(key=lambda h: h["score"], reverse=True)
    top_hits = hits[:3]

    # Build a concise context blob for the LLM (trim to avoid huge prompts)
    context_chunks = []
    for h in top_hits:
        prefix = f"[{h['filename']} p{h['page_index'] + 1}] "
        context_chunks.append(prefix + h["snippet"])
    context_blob = "\n\n".join(context_chunks)[:2400]

    try:
        llm = ask_llm_text(
            query=(
                f"Question: {question.strip()}\n\n"
                "Use only the provided document snippets to answer clearly.\n"
                f"Context:\n{context_blob}"
            ),
            system_hint=(
                "You are a helpful tutor. Stay grounded to the provided document snippets. "
                "Answer concisely in 3-6 bullets or short paragraphs."
            ),
        )
        llm_answer = llm.get("answer", "").strip()
    except LLMTextError as e:
        llm_answer = f"LLM unavailable; showing top snippets instead. Error: {e}"

    return {
        "session_id": session_id,
        "mode": mode,
        "answer": llm_answer,
        "hits": top_hits,
    }


@router.post("/chat-mode")
async def chat_mode(
    session_id: str = Form(...),
    doc_id: Optional[str] = Form(None),
    max_items: int = Form(6),
):
    """
    Chat-style summary endpoint for uploaded documents.

    - Uses only extracted text stored in the session
    - Returns bullets per document (no paragraphs)
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    session = SESSION_STORE.get(session_id)
    if not session or not session.documents:
        raise HTTPException(
            status_code=400,
            detail="No documents found in session. Please upload documents first.",
        )

    documents = (
        [session.documents[doc_id]]
        if doc_id and doc_id in session.documents
        else list(session.documents.values())
    )

    summaries = []
    for doc in documents:
        all_text = "\n\n".join([p.text or "" for p in doc.pages])
        bullets = _to_bullets(all_text, max_items=max_items)
        summaries.append(
            {
                "doc_id": doc.doc_id,
                "filename": doc.filename,
                "bullets": bullets,
                "page_count": len(doc.pages),
            }
        )

    return {"session_id": session_id, "summaries": summaries}


def _tokenize(text: str) -> List[str]:
    return [t for t in (text or "").lower().split() if t]


def _overlap_score(q_tokens: List[str], doc_tokens: List[str]) -> int:
    if not q_tokens or not doc_tokens:
        return 0
    doc_set = set(doc_tokens)
    return sum(1 for t in q_tokens if t in doc_set)


def _to_bullets(text: str, max_items: int = 2) -> List[str]:
    """Split text into very short bullet points for readability (no trailing ellipsis)."""
    flat = " ".join(text.split())
    parts = [
        p.strip()
        for p in flat.replace("?", ".").replace("!", ".").split(".")
        if p.strip()
    ]
    bullets: List[str] = []

    def add_chunk(chunk: str):
        chunk = chunk.strip()
        if not chunk:
            return
        bullets.append(f"• {chunk}")

    if parts:
        for p in parts:
            add_chunk(p)
            if len(bullets) >= max_items:
                break
    else:
        step = 140
        for i in range(0, len(flat), step):
            add_chunk(flat[i : i + step])
            if len(bullets) >= max_items:
                break

    if not bullets:
        bullets = ["• No concise text available"]
    return bullets
