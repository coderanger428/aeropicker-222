from __future__ import annotations

import json
from typing import Protocol

# Copy the resume into JSON. Keys come from the page. There is no resume schema.
RESUME_PARSE_RULES = """
Convert the resume in <resume_text> into one JSON object.

Copy the document. Keep every section, heading, and field that is printed, in the order on the page. Use the printed headings and labels as the JSON keys. Nest a value when the page nests it. Use an array when the page repeats the same kind of entry. Copy the wording, dates, and numbers as written.

Do not rename anything into a standard resume format. Do not drop a section. Do not invent a field. Do not summarize or rewrite.

Output one raw JSON object and no markdown.
""".strip()


class ResumeAnalyzer(Protocol):
    rules: str

    def analyze(self, text: str) -> dict:
        """Return the resume JSON. `text` is the PDF extract."""


def message_parts(text: str) -> list[dict]:
    """The user message: the resume text only."""
    return [{"type": "text", "text": _tagged("resume_text", text.strip())}]


def _tagged(tag: str, value: str) -> str:
    safe = value.replace(f"</{tag}>", f"</ {tag}>")
    return f"<{tag}>\n{safe}\n</{tag}>"


def profile_reference(details: dict | None) -> dict:
    source = details or {}
    jobs = []
    for item in source.get("experience") or []:
        company = str(item.get("company") or "").strip()
        start = str(item.get("start_date") or "").strip()
        end = str(item.get("end_date") or "").strip()
        current = bool(item.get("current"))
        if not (company or start or end or current):
            continue
        jobs.append({"company": company, "start": start, "end": "" if current else end, "current": current})
    schools = []
    for item in source.get("education") or []:
        school = str(item.get("school") or "").strip()
        degree = str(item.get("degree") or "").strip()
        start = str(item.get("start_date") or "").strip()
        end = str(item.get("end_date") or "").strip()
        if not (school or degree or start or end):
            continue
        schools.append({"school": school, "degree": degree, "start": start, "end": end})
    links = []
    for label, key in (("LinkedIn", "linkedin"), ("GitHub", "github"), ("Portfolio", "portfolio"), ("X", "x"), ("Facebook", "facebook")):
        url = str(source.get(key) or "").strip()
        if url:
            links.append({"label": label, "url": url})
    return {
        "name": str(source.get("full_name") or "").strip(),
        "phone": str(source.get("phone") or "").strip(),
        "email": str(source.get("email") or "").strip(),
        "location": str(source.get("address") or "").strip(),
        "links": links,
        "experience": jobs,
        "education": schools,
    }


def _included(source: dict, flag: str) -> bool:
    return source.get(flag, True) is not False


def resume_contact(details: dict | None) -> dict:
    """The printed header. Name and email are always included. Other contacts follow their checkboxes."""
    source = details or {}
    links = []
    for label, key, flag in (
        ("LinkedIn", "linkedin", "include_linkedin"),
        ("GitHub", "github", "include_github"),
        ("Portfolio", "portfolio", "include_portfolio"),
        ("X", "x", "include_x"),
        ("Facebook", "facebook", "include_facebook"),
    ):
        url = str(source.get(key) or "").strip()
        if url and _included(source, flag):
            links.append({"label": label, "url": url})
    return {
        "name": str(source.get("full_name") or "").strip(),
        "phone": str(source.get("phone") or "").strip() if _included(source, "include_phone") else "",
        "email": str(source.get("email") or "").strip(),
        "location": str(source.get("address") or "").strip() if _included(source, "include_address") else "",
        "links": links,
    }


STATIC_RESUME_CONTENT = {
    "Notice": "Stand-in JSON from the analyzer interface. No model was called.",
}


class StaticResumeAnalyzer:
    """Stand-in for the model call. Reads nothing from the model and returns a fixed document."""

    rules = RESUME_PARSE_RULES

    def analyze(self, text: str) -> dict:
        del text
        return dict(STATIC_RESUME_CONTENT)
