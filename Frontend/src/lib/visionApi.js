const DEFAULT_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export function getOrCreateSessionId() {
  const key = "insighthub_vision_session_id";
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = (crypto?.randomUUID?.() || `sid-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(key, sid);
  }
  return sid;
}

export async function uploadVisionDocuments(files) {
  const sessionId = getOrCreateSessionId();
  const form = new FormData();
  Array.from(files).forEach((f) => form.append("files", f));

  const res = await fetch(`${DEFAULT_BASE_URL}/vision/session/${encodeURIComponent(sessionId)}/documents`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to upload documents");
  }
  return res.json();
}

export async function askVisionTutor({ query, imageBlob, selectedDocIds }) {
  const sessionId = getOrCreateSessionId();
  const form = new FormData();
  form.append("query", query);

  // IMPORTANT: FastAPI expects repeated fields for List[str] in multipart
  selectedDocIds.forEach((id) => form.append("selected_doc_ids", id));

  form.append("image", imageBlob, "screenshot.png");

  const res = await fetch(`${DEFAULT_BASE_URL}/vision/session/${encodeURIComponent(sessionId)}/ask`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Vision ask failed");
  }
  return res.json();
}