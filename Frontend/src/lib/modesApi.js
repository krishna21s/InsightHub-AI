const DEFAULT_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

import { getOrCreateSessionId } from "./visionApi";

export async function fetchChatModeSummaries({
  docId = null,
  maxItems = 6,
  sessionId,
} = {}) {
  const sid = sessionId || getOrCreateSessionId();
  const form = new FormData();
  form.append("session_id", sid);
  form.append("max_items", String(maxItems));
  if (docId) {
    form.append("doc_id", docId);
  }

  const res = await fetch(`${DEFAULT_BASE_URL}/modes/chat-mode`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to fetch chat-mode summaries");
  }

  return res.json();
}
