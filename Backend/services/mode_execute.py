"""
Service for generating mode-specific explanations and content.
"""

from typing import Dict, Any, List


def _bullets(lines: List[str], max_items: int = 4, max_len: int = 120) -> str:
    out = []
    for ln in lines:
        t = " ".join(ln.strip().split())
        if not t:
            continue
        out.append(f"• {t}")
        if len(out) >= max_items:
            break
    if not out:
        out = ["• Not enough content to summarize"]
    return "\n".join(out)


def _first_bits(content: str, max_items: int = 3, max_len: int = 120) -> List[str]:
    flat = " ".join((content or "").split())
    parts = [p.strip() for p in flat.replace("?", ".").replace("!", ".").split(".") if p.strip()]
    out: List[str] = []
    if parts:
        for p in parts:
            out.append(p)
            if len(out) >= max_items:
                break
    else:
        step = max_len
        for i in range(0, len(flat), step):
            out.append(flat[i : i + step] + ("…" if len(flat) > i + step else ""))
            if len(out) >= max_items:
                break
    return out


def generate_mode_explanation(mode: str, content: str, filename: str) -> Dict[str, Any]:
    """
    Generate mode-specific explanations based on the learning mode.

    Args:
        mode: The learning mode (student, teacher, exam, revision)
        content: The extracted text content
        filename: Name of the document

    Returns:
        Dictionary containing mode-specific explanation and metadata
    """

    if mode == "student":
        return generate_student_explanation(content, filename)
    elif mode == "teacher":
        return generate_teacher_explanation(content, filename)
    elif mode == "exam":
        return generate_exam_explanation(content, filename)
    elif mode == "revision":
        return generate_revision_explanation(content, filename)
    else:
        return {
            "title": "Unknown Mode",
            "summary": "The selected mode is not supported.",
            "content": content[:500] + "..." if len(content) > 500 else content,
        }


def generate_student_explanation(content: str, filename: str) -> Dict[str, Any]:
    """Generate student-friendly explanation."""
    concepts = _first_bits(content, max_items=3, max_len=120)

    summary = _bullets([
        f"Document: {filename}",
        f"Subject: {extract_subject(content)}",
        *concepts,
        "Next: read key points, ask a question, try one example",
    ], max_items=4, max_len=120)

    return {
        "title": f"Student Learning Guide: {filename}",
        "summary": summary,
        "mode": "student",
        "learning_points": concepts,
        "estimated_time": f"{len(content) // 1000 + 5} minutes",
    }


def generate_teacher_explanation(content: str, filename: str) -> Dict[str, Any]:
    """Generate teacher-focused explanation for lesson planning."""

    summary = _bullets([
        f"Teach: {filename}",
        f"Topic: {extract_subject(content)}",
        "Objectives: clarity, examples, engage, quick assess",
        "Plan: intro 5m · explain 15m · Q&A 10m · quiz 5m",
        "Emphasize: simple words, real-world link, visuals",
    ], max_items=5, max_len=120)

    return {
        "title": f"Teaching Guide: {filename}",
        "summary": summary,
        "mode": "teacher",
        "teaching_duration": f"{len(content) // 1500 + 15} minutes",
        "difficulty_level": assess_difficulty(content),
    }


def generate_exam_explanation(content: str, filename: str) -> Dict[str, Any]:
    """Generate exam-focused content with practice questions."""

    # Generate sample questions based on content
    questions = generate_sample_questions(content)

    summary = _bullets([
        f"Exam prep: {filename}",
        "Review key ideas, then practice",
        "Spot weak areas, revisit diagrams",
        "Time your practice",
        *[f"Q: {q}" for q in questions],
        "Tips: read carefully, manage time, review answers",
    ], max_items=6, max_len=120)

    return {
        "title": f"Exam Prep: {filename}",
        "summary": summary,
        "mode": "exam",
        "practice_questions": questions,
        "topics_count": len(content.split("\n")),
    }


def generate_revision_explanation(content: str, filename: str) -> Dict[str, Any]:
    """Generate quick revision notes."""

    # Extract main points for quick revision
    key_points = extract_key_points(content)

    summary = _bullets([
        f"Revision: {filename}",
        f"Quick gist: {(content[:100].strip() + '…') if content else 'n/a'}",
        *[f"Point: {p}" for p in key_points],
        "Checklist: review, look at visuals, self-test, note gaps",
        f"Time: {len(content) // 2000 + 3} min",
    ], max_items=6, max_len=120)

    return {
        "title": f"Quick Revision: {filename}",
        "summary": summary,
        "mode": "revision",
        "key_points": key_points,
        "revision_time": f"{len(content) // 2000 + 3} minutes",
    }


def extract_subject(content: str) -> str:
    """Extract likely subject from content (simplified)."""
    content_lower = content.lower()

    subjects = {
        "mathematics": ["equation", "theorem", "proof", "calculate", "formula"],
        "science": ["experiment", "hypothesis", "research", "theory", "observation"],
        "programming": ["code", "function", "algorithm", "variable", "class"],
        "history": ["century", "war", "empire", "dynasty", "period"],
        "literature": ["author", "poem", "novel", "character", "theme"],
    }

    for subject, keywords in subjects.items():
        if any(keyword in content_lower for keyword in keywords):
            return subject

    return "this topic"


def assess_difficulty(content: str) -> str:
    """Assess content difficulty level."""
    words = content.split()
    avg_word_length = sum(len(word) for word in words) / max(len(words), 1)

    if avg_word_length < 5:
        return "Beginner"
    elif avg_word_length < 7:
        return "Intermediate"
    else:
        return "Advanced"


def generate_sample_questions(content: str) -> list:
    """Generate sample questions from content."""
    # Simplified question generation
    questions = [
        "What are the main concepts covered in this document?",
        "Explain the key principles discussed in the material.",
        "How can the concepts be applied in real-world scenarios?",
        "What are the important definitions mentioned?",
        "Describe the relationships between different topics covered.",
    ]

    return questions[:3]  # Return top 3


def extract_key_points(content: str) -> list:
    """Extract key points for revision."""
    lines = [line.strip() for line in content.split("\n") if line.strip()]

    # Filter for likely important lines (simplified heuristic)
    key_points = []
    for line in lines:
        # Look for lines that seem like headings or important statements
        if len(line) > 30 and len(line) < 150:
            key_points.append(line)
        if len(key_points) >= 5:
            break

    if not key_points:
        # Fallback to first few substantial lines
        key_points = [line for line in lines if len(line) > 20][:5]

    return key_points
