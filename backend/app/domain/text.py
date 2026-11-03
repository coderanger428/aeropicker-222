import re

STOP_WORDS = {
    "about", "ability", "able", "across", "after", "also", "and", "are", "been", "being",
    "candidate", "could", "experience", "for", "from", "have", "high", "including", "into",
    "job", "looking", "more", "must", "other", "our", "please", "plus", "preferred",
    "qualifications", "required", "requirements", "responsibilities", "role", "seeking",
    "should", "strong", "such", "team", "than", "that", "the", "their", "them", "then",
    "they", "this", "using", "well", "what", "when", "where", "which", "while", "will",
    "with", "within", "work", "working", "would", "year", "years", "you", "your",
}


def extract_keywords(text: str, limit: int = 8) -> list[str]:
    counts: dict[str, tuple[str, int]] = {}
    for match in re.findall(r"[A-Za-z][A-Za-z0-9+.#-]{2,}", text):
        display = re.sub(r"[.+#-]+$", "", match)
        key = display.lower()
        if len(key) < 4 or key in STOP_WORDS:
            continue
        current = counts.get(key)
        if current is None:
            counts[key] = (display, 1)
        else:
            counts[key] = (current[0], current[1] + 1)
    ordered = sorted(counts.values(), key=lambda item: (-item[1], item[0]))
    return [display for display, _count in ordered[:limit]]


def skill_label(word: str) -> str:
    if word != word.lower():
        return word
    return word[:1].upper() + word[1:]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (slug[:48] or "document")


def validate_job_link(value: str) -> str | None:
    link = value.strip()
    if not link:
        return None
    if not (link.startswith("http://") or link.startswith("https://")):
        return "Job link must start with http:// or https://."
    if " " in link:
        return "Job link must be a valid URL."
    return None
