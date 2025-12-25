from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

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
    Upload multiple documents for a session and (later) extract per-page/slide text.

    NOTE: This is scaffolding only. Next step we’ll:
      - validate file types
      - extract text per page/slide/chunk
      - store in a session store (in-memory with TTL)
    """
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # For now, just echo metadata (we'll replace with real ingestion next)
    docs = []
    for f in files:
        docs.append(
            {
                "doc_id": f"{session_id}:{f.filename}",
                "filename": f.filename,
                "content_type": f.content_type,
            }
        )

    return {"session_id": session_id, "documents": docs}


@router.get("/session/{session_id}/documents")
def list_documents(session_id: str):
    """
    List documents uploaded for this session.

    NOTE: This is scaffolding only. Next step we’ll pull from session store.
    """
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    return {"session_id": session_id, "documents": []}


@router.post("/session/{session_id}/ask")
async def vision_ask(
    session_id: str,
    query: str = Form(...),
    selected_doc_ids: List[str] = Form(..., description="At least one selected doc_id"),
    image: UploadFile = File(..., description="Screenshot image"),
):
    """
    Main Vision Tutor endpoint (multipart-first):
      - query: user question
      - selected_doc_ids: user-selected docs (min 1)
      - image: screenshot (required)

    Next step we’ll:
      - load extracted text for selected docs from session store
      - OCR screenshot (optional) + select best matching pages
      - call unified Ollama/Qwen endpoint (same as your previous project)
    """
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")

    if not query.strip():
        raise HTTPException(status_code=400, detail="Missing query")

    selected_doc_ids = [d for d in (selected_doc_ids or []) if d and d.strip()]
    if len(selected_doc_ids) < 1:
        raise HTTPException(status_code=400, detail="Select at least one document")

    if not image:
        raise HTTPException(status_code=400, detail="Missing screenshot image")

    return {
        "session_id": session_id,
        "query": query,
        "selected_doc_ids": selected_doc_ids,
        "image_received": True,
        "answer": "Scaffold: vision model call not wired yet.",
    }


@router.delete("/session/{session_id}")
def delete_session(session_id: str):
    """
    Delete the session and its temporary stored documents/text.

    NOTE: Scaffold; will delete from session store next.
    """
    if not session_id.strip():
        raise HTTPException(status_code=400, detail="Missing session_id")
    return {"session_id": session_id, "deleted": True}
