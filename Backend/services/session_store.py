from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class PageData:
    """
    Represents extracted text for one logical page:
    - PDF: page
    - PPTX: slide
    - DOCX: chunk ("virtual page")
    """

    index: int
    text: str


@dataclass
class DocumentData:
    doc_id: str
    filename: str
    doc_type: str  # "pdf" | "pptx" | "docx"
    pages: List[PageData] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)


@dataclass
class SessionData:
    session_id: str
    documents: Dict[str, DocumentData] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)


class SessionStore:
    """
    Simple in-memory session store with TTL eviction.
    This matches your current requirement (frontend stores session_id in localStorage).

    NOTE:
    - Not multi-instance safe.
    - Data is lost on server restart.
    - Good for MVP; later swap to Redis/DB.
    """

    def __init__(self, ttl_seconds: int = 60 * 60):
        self.ttl_seconds = ttl_seconds
        self._sessions: Dict[str, SessionData] = {}

    def _now(self) -> float:
        return time.time()

    def cleanup_expired(self) -> int:
        """
        Remove expired sessions.
        Returns number of removed sessions.
        """
        now = self._now()
        expired = [
            sid
            for sid, s in self._sessions.items()
            if (now - s.last_accessed) > self.ttl_seconds
        ]
        for sid in expired:
            self._sessions.pop(sid, None)
        return len(expired)

    def get_or_create(self, session_id: str) -> SessionData:
        if not session_id or not session_id.strip():
            raise ValueError("session_id is required")

        self.cleanup_expired()

        session = self._sessions.get(session_id)
        if session is None:
            session = SessionData(session_id=session_id)
            self._sessions[session_id] = session

        session.last_accessed = self._now()
        return session

    def get(self, session_id: str) -> Optional[SessionData]:
        if not session_id or not session_id.strip():
            return None
        self.cleanup_expired()
        session = self._sessions.get(session_id)
        if session:
            session.last_accessed = self._now()
        return session

    def delete(self, session_id: str) -> bool:
        if not session_id or not session_id.strip():
            return False
        self.cleanup_expired()
        return self._sessions.pop(session_id, None) is not None

    def upsert_document(
        self,
        session_id: str,
        doc_id: str,
        filename: str,
        doc_type: str,
        pages: List[PageData],
    ) -> DocumentData:
        session = self.get_or_create(session_id)

        doc = DocumentData(
            doc_id=doc_id,
            filename=filename,
            doc_type=doc_type,
            pages=pages or [],
        )
        session.documents[doc_id] = doc
        session.last_accessed = self._now()
        return doc

    def list_documents(self, session_id: str) -> List[DocumentData]:
        session = self.get(session_id)
        if not session:
            return []
        return list(session.documents.values())

    def get_documents(self, session_id: str, doc_ids: List[str]) -> List[DocumentData]:
        session = self.get(session_id)
        if not session:
            return []
        out: List[DocumentData] = []
        for did in doc_ids:
            doc = session.documents.get(did)
            if doc:
                out.append(doc)
        return out


# Global singleton store for MVP (simple and effective for now)
SESSION_STORE = SessionStore(ttl_seconds=int(60 * 60))  # 1 hour default
