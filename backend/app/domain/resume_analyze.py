from __future__ import annotations

import json
from typing import Protocol

# The future model call must follow this. Company names and work periods are the
# strict part: a master resume often misstates them, and the profile is the reference.
RESUME_PARSE_RULES = """
Convert the resume in <resume_text> to JSON. <profile_json> is the source of truth: use its value whenever a key is present. Personal info (name, phone, email, location, links) comes only from the profile, "" if absent.

Rules:
- If profile experience or education is non-empty, keep only the matching resume entries. If empty, take them from the resume.
- Everything else (headline, availability, summary, skills, titles, job locations, highlights) comes from the resume only. Don't invent; use "" or [] if missing.

Output one raw JSON object, no markdown or commentary:
{"name":"","headline":"","location":"","phone":"","email":"","availability":"","links":[{"label":"","url":""}],"summary":"","skills":[{"group":"","items":[""]}],"experience":[{"company":"","title":"","location":"","start":"","end":"","current":false,"highlights":[""]}],"education":[{"school":"","degree":"","start":"","end":""}]}
""".strip()


class ResumeAnalyzer(Protocol):
    rules: str

    def analyze(self, text: str, reference: dict) -> dict:
        """Return the resume JSON. `text` is the PDF extract. `reference` is the profile."""


def message_parts(text: str, reference: dict) -> list[dict]:
    """The user message: resume text and profile JSON, each in its own text part."""
    return [
        {"type": "text", "text": _tagged("resume_text", text.strip())},
        {"type": "text", "text": _tagged("profile_json", json.dumps(reference, ensure_ascii=False))},
    ]


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
    "name": "Static analysis",
    "headline": "Demo parser result",
    "location": "",
    "phone": "",
    "email": "",
    "availability": "",
    "links": [],
    "summary": "Stand-in JSON from the analyzer interface. No model was called. Company names and work periods are reserved for the profile reference.",
    "skills": [],
    "experience": [
        {
            "company": "Example Company",
            "title": "Engineer",
            "location": "",
            "start": "Jan 2020",
            "end": "",
            "current": True,
            "highlights": ["Replace this document when the model call is connected."],
        }
    ],
    "education": [],
}


class StaticResumeAnalyzer:
    """Stand-in for the model call. Reads nothing from the model and returns a fixed document."""

    rules = RESUME_PARSE_RULES

    def analyze(self, text: str, reference: dict) -> dict:
        del text, reference
        return {
            "name": STATIC_RESUME_CONTENT["name"],
            "headline": STATIC_RESUME_CONTENT["headline"],
            "location": STATIC_RESUME_CONTENT["location"],
            "phone": STATIC_RESUME_CONTENT["phone"],
            "email": STATIC_RESUME_CONTENT["email"],
            "availability": STATIC_RESUME_CONTENT["availability"],
            "links": [],
            "summary": STATIC_RESUME_CONTENT["summary"],
            "skills": [],
            "experience": [
                {
                    "company": "Example Company",
                    "title": "Engineer",
                    "location": "",
                    "start": "Jan 2020",
                    "end": "",
                    "current": True,
                    "highlights": ["Replace this document when the model call is connected."],
                }
            ],
            "education": [],
        }
