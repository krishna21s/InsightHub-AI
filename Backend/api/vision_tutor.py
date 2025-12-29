from __future__ import annotations

from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.context_selector import match_pages_by_screenshot
from services.doc_extract import DocumentExtractionError, extract_pages
from services.session_store import SESSION_STORE
from services.vision_model import VisionModelError, ask_vision_model

router = APIRouter()


@router.get("/test")
def vision_test():
    """
    Simple endpoint to verify the Vision Tutor backend is available.
    """
    return {"message": "Vision Tutor backend — connected", "status": "ok"}


@router.post("/session/{session_id}/documents")
async def upload_documents(
    session_id: str,
    files: List[UploadFile] = File(
        ..., description="Upload one or more PDF/PPTX/DOCX files"
    ),
):
    """
    Upload multiple documents for a session.

    - Extract text per page (PDF) / slide (PPTX) / chunk (DOCX)
    - Store temporarily in SESSION_STORE for that session
    - Return doc metadata for UI selection
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    uploaded_docs = []

    for f in files:
        filename = f.filename or "uploaded"
        content = await f.read()

        if not content:
            raise HTTPException(status_code=400, detail=f"Empty file: {filename}")

        try:
            doc_type, pages = extract_pages(filename=filename, content=content)
        except DocumentExtractionError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        # MVP doc_id (stable per session). If you want true uniqueness later, swap to uuid.
        doc_id = f"{session_id}:{filename}"

        SESSION_STORE.upsert_document(
            session_id=session_id,
            doc_id=doc_id,
            filename=filename,
            doc_type=doc_type,
            pages=pages,
        )

        uploaded_docs.append(
            {
                "doc_id": doc_id,
                "filename": filename,
                "doc_type": doc_type,
                "page_count": len(pages),
            }
        )

    return {"session_id": session_id, "documents": uploaded_docs}


@router.get("/session/{session_id}/documents")
def list_documents(session_id: str):
    """
    List uploaded documents for a session (for the UI document selector).
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    docs = SESSION_STORE.list_documents(session_id)
    return {
        "session_id": session_id,
        "documents": [
            {
                "doc_id": d.doc_id,
                "filename": d.filename,
                "doc_type": d.doc_type,
                "page_count": len(d.pages),
            }
            for d in docs
        ],
    }


@router.post("/session/{session_id}/ask")
async def vision_ask(
    session_id: str,
    query: str = Form(...),
    selected_doc_ids: List[str] = Form(..., description="At least one selected doc_id"),
    image: UploadFile = File(..., description="Screenshot image"),
):
    """
    Vision Tutor ask endpoint (multipart):
      - Requires: query + screenshot + selected_doc_ids (>=1)
      - OCR screenshot to locate best matching page text from selected documents
      - Calls unified vision model with screenshot + query + matched text context
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Missing query")

    selected_doc_ids = [d for d in (selected_doc_ids or []) if d and d.strip()]
    if len(selected_doc_ids) < 1:
        raise HTTPException(status_code=400, detail="Select at least one document")

    selected_docs = SESSION_STORE.get_documents(
        session_id=session_id, doc_ids=selected_doc_ids
    )
    if len(selected_docs) < 1:
        raise HTTPException(
            status_code=400,
            detail="Selected documents not found in this session. Upload documents first.",
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty screenshot image")

    # Build best page context using OCR + overlap scoring (text-only context)
    context_text = None
    matched_pages = []
    try:
        ctx, matches = match_pages_by_screenshot(
            image_bytes=image_bytes,
            selected_docs=selected_docs,
            top_k=4,
        )
        context_text = ctx if ctx.strip() else None
        matched_pages = matches
    except Exception:
        # OCR not available / failed -> still answer via vision model without extra context
        context_text = None
        matched_pages = []

    try:
        model_result = ask_vision_model(
            query=query,
            image_bytes=image_bytes,
            context_text=context_text,
        )
    except VisionModelError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return {
        "session_id": session_id,
        "query": query,
        "selected_doc_ids": selected_doc_ids,
        "answer": model_result["answer"],
        "matched_pages": [
            {
                "doc_id": m.doc_id,
                "filename": m.filename,
                "page_index": m.page_index,
                "score": m.score,
            }
            for m in matched_pages
        ],
    }


@router.delete("/session/{session_id}")
def delete_session(session_id: str):
    """
    Delete the session and its temporary stored documents/text.
    """
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    deleted = SESSION_STORE.delete(session_id)
    return {"session_id": session_id, "deleted": deleted}
