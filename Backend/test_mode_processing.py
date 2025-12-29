"""
Quick test script to verify mode processing without vision
"""

from services.session_store import SESSION_STORE, DocumentData, PageData
from services.mode_execute import generate_mode_explanation

# Create a test session
session_id = "test-session-123"
session = SESSION_STORE.get_or_create(session_id)

# Add a sample document
test_pages = [
    PageData(
        index=0,
        text="Introduction to Python Programming. Python is a high-level programming language.",
    ),
    PageData(
        index=1,
        text="Variables and Data Types. Python supports integers, floats, strings, and more.",
    ),
    PageData(
        index=2,
        text="Control Flow. Python uses if statements, for loops, and while loops.",
    ),
]

doc = DocumentData(
    doc_id=f"{session_id}:test.pdf",
    filename="test.pdf",
    doc_type="pdf",
    pages=test_pages,
)

SESSION_STORE.upsert_document(
    session_id=session_id,
    doc_id=doc.doc_id,
    filename=doc.filename,
    doc_type=doc.doc_type,
    pages=doc.pages,
)

# Test mode processing
print("Testing Student Mode:")
student_result = generate_mode_explanation(
    "student", "\n\n".join(p.text for p in test_pages), "test.pdf"
)
print(student_result["summary"])
print("\n" + "=" * 80 + "\n")

print("Testing Teacher Mode:")
teacher_result = generate_mode_explanation(
    "teacher", "\n\n".join(p.text for p in test_pages), "test.pdf"
)
print(teacher_result["summary"])
print("\n" + "=" * 80 + "\n")

print("Testing Exam Mode:")
exam_result = generate_mode_explanation(
    "exam", "\n\n".join(p.text for p in test_pages), "test.pdf"
)
print(exam_result["summary"])
print("\n" + "=" * 80 + "\n")

print("Testing Revision Mode:")
revision_result = generate_mode_explanation(
    "revision", "\n\n".join(p.text for p in test_pages), "test.pdf"
)
print(revision_result["summary"])

# Verify session has documents
print("\n" + "=" * 80)
print(f"\nSession {session_id} has {len(session.documents)} document(s)")
for doc_id, doc_data in session.documents.items():
    print(f"  - {doc_data.filename}: {len(doc_data.pages)} pages")
