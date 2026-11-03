from __future__ import annotations

import json
from typing import Protocol

from pydantic import ValidationError

from app.schemas import MasterResumeContent

# Saved as the tailor prompt. One call reads the raw job text and returns the resume and cover letter.
TAILOR_PROMPT = """
Tailor a resume to one job and write its cover letter.

Inputs (user message): <base_resume_json> (master resume), <jd_text> (the raw job description), <company> (hiring company).

Read <jd_text> and use it fully:
- Key skills: every required or must-have skill, tool, and qualification.
- Preferred skills: every skill marked preferred, nice-to-have, a plus, or bonus.
- Useful expressions: every short phrase in the posting worth mirroring, such as a responsibility, a domain term, or the posting's own name for a tool or skill.
Use every one of these. Do not drop, shorten, or merely imply one. Ignore benefits, equal-opportunity statements, and company marketing.

Resume rules:
- Keep the master's structure, keys, and facts: companies, titles, locations, periods, and education stay unchanged. Never invent employers, titles, dates, degrees, metrics, or achievements.
- Do not edit name, location, phone, email, or links. That contact header is the profile's, and the master resume must not replace it.
- Add every key skill and preferred skill to skills. Each skill appears in exactly one group, and the group must name what the skill is. A web API framework such as FastAPI belongs with backend tools, never under Frontend; a UI library belongs with frontend tools, never under Backend. Keep the master's group when that group already fits. Add a new group only when none fits. Do not file a skill under a group because the job description lists it beside unrelated tools. Key skills come first inside their group.
- Work every key skill and every useful expression into the summary and experience highlights by rewording existing highlights, placing each term where that role's work plausibly supports it. Don't add bullets unless needed; keep the total length close to the master.
- No repetition: each skill, useful expression, and opening action verb appears once across the resume and the cover letter together. A skill already named in its group is not named again in another group. Avoid buzzwords (leverage, spearhead, passionate, etc.).

Cover letter rules:
- Body only: no date, address, subject line, or header.
- Start with a kind greeting addressed to the <company> hiring team. End with "Best Regards," then a new line with the resume's full name.
- Polite, professional tone; about one page (280-350 words), 3-4 short paragraphs.
- The resume and the letter together must carry every useful expression. Use the letter for expressions that do not fit a highlight. Mention <company> and the strongest matches between the resume and the job. Use only facts from the resume.

Output one raw JSON object, no markdown or commentary, with the resume in the master's exact format. Use \\n for line breaks in cover_letter:
{"resume":{...},"cover_letter":""}
""".strip()


def tailor_message_parts(resume: dict, job_text: str, company: str) -> list[dict]:
    """The tailor user message: master resume, raw job description, and hiring company."""
    return [
        {"type": "text", "text": _tagged("base_resume_json", json.dumps(resume, ensure_ascii=False))},
        {"type": "text", "text": _tagged("jd_text", job_text.strip())},
        {"type": "text", "text": _tagged("company", company.strip())},
    ]


def letter_from_text(text: str, fallback_name: str = "") -> dict:
    """Split a plain cover letter into the fields the classic template renders."""
    chunks = [part.strip() for part in text.replace("\r\n", "\n").split("\n\n") if part.strip()]
    salutation = ""
    closing = ""
    signature = fallback_name.strip()
    if chunks and "\n" not in chunks[0] and (chunks[0].lower().startswith("dear ") or chunks[0].endswith(",")):
        salutation = chunks.pop(0)
    if chunks:
        lines = [line.strip() for line in chunks[-1].split("\n") if line.strip()]
        closing_at = next((index for index, line in enumerate(lines) if _closing_line(line)), -1)
        if closing_at >= 0:
            closing = lines[closing_at].rstrip(",") + ","
            if closing_at + 1 < len(lines):
                signature = " ".join(lines[closing_at + 1 :]).strip() or signature
            head = lines[:closing_at]
            chunks.pop()
            if head:
                chunks.append("\n".join(head))
    return {
        "subject": "",
        "salutation": salutation,
        "paragraphs": chunks,
        "bullets": [],
        "closing": closing,
        "signature": signature,
    }


def _closing_line(line: str) -> bool:
    token = line.strip().rstrip(",").lower()
    return token in {"best regards", "kind regards", "regards", "sincerely", "yours sincerely", "warm regards"}


def tailor_result(parsed: dict) -> dict:
    """Require the tailored resume and the cover letter from one response."""
    if not isinstance(parsed, dict):
        raise ValueError("the model did not return an object")
    resume = parsed.get("resume")
    letter = parsed.get("cover_letter", parsed.get("coverLetter"))
    if not isinstance(resume, dict) or not isinstance(letter, str):
        got = ", ".join(str(key) for key in parsed) or "none"
        raise ValueError(f"missing resume or cover_letter; got {got}")
    text = letter.strip()
    if not text:
        raise ValueError("cover_letter is empty")
    try:
        content = MasterResumeContent.model_validate(resume).model_dump(by_alias=True)
    except ValidationError as exc:
        parts = [f"{'.'.join(str(part) for part in item.get('loc', ()))} {item.get('type', 'invalid')}" for item in exc.errors()]
        raise ValueError("; ".join(parts) or "resume fields do not match") from exc
    return {"resume": content, "cover_letter": text}


def _tagged(tag: str, value: str) -> str:
    safe = value.replace(f"</{tag}>", f"</ {tag}>")
    return f"<{tag}>\n{safe}\n</{tag}>"


class ResumeTailor(Protocol):
    rules: str

    def tailor(self, master_resume: dict, job_text: str, company: str) -> dict:
        """Return the tailored resume and cover letter. Not called yet."""


def tailor_packet(master_resume: dict, job: dict) -> dict:
    """The document a later tailor call would receive."""
    return {"master_resume": master_resume, "job": job}
