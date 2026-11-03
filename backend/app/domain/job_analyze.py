from __future__ import annotations

from collections import Counter
from copy import deepcopy
import json
import re
from typing import Protocol

# Saved as the tailor prompt. One call rewrites the summary and experience inside the converted resume.
TAILOR_PROMPT = """
Rewrite the summary and the work experience inside one converted resume, and write its cover letter.

Inputs (user message): <resume_json>, <jd_text>, <company>, <candidate_name>.

<resume_json> is a conversion of the original document. Its keys are the document's own. Do not rename them.

Use <jd_text> for the kind of work the job wants. Ignore benefits, equal-opportunity statements, and company marketing. Rewrite only the summary block and the work-experience block. The letter may use only those two blocks.

Return one raw JSON object, no markdown. Use \\n inside cover_letter:
{"summary_path":[""],"experience_path":[""],"summary":null,"experience":null,"cover_letter":""}

Path rules:
- summary_path and experience_path are the key path to those blocks in <resume_json>. A number in the path is a list index.
- Point at the whole block, not at one line inside it.
- summary and experience are those blocks with the same JSON shape. Update the prose only.

Experience rules:
- Keep every entry. Do not change an employer, title, location, or date, and do not add or remove an entry.
- You may reword a responsibility and add a soft achievement when the work already described supports it.
- Do not invent numeric measurements. No new counts, percentages, money, team sizes, durations, or other numbers.

Summary rules:
- Rewrite the summary for this job from the summary and the experience only.
- The same ban on new numbers applies.

Cover letter rules:
- Use only the summary and the experience.
- Body only: no date, address, subject line, or header.
- Start with a kind greeting to the <company> hiring team. End with "Best Regards," then a new line with <candidate_name>.
- Polite and professional, 280-350 words, 3-4 short paragraphs.
- No new numbers. Avoid buzzwords (leverage, spearhead, passionate, etc.).
""".strip()


def tailor_message_parts(resume: dict, job_text: str, company: str, candidate_name: str) -> list[dict]:
    """The converted resume, the job text, and the two letter facts."""
    return [
        {"type": "text", "text": _tagged("resume_json", json.dumps(resume, ensure_ascii=False))},
        {"type": "text", "text": _tagged("jd_text", job_text.strip())},
        {"type": "text", "text": _tagged("company", company.strip())},
        {"type": "text", "text": _tagged("candidate_name", candidate_name.strip())},
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


def tailor_result(parsed: dict, original: dict) -> dict:
    """Splice the rewritten summary and experience back into a copy of the converted resume."""
    if not isinstance(parsed, dict):
        raise ValueError("the model did not return an object")
    letter = parsed.get("cover_letter", parsed.get("coverLetter"))
    if not isinstance(letter, str) or not letter.strip():
        raise ValueError("cover_letter is empty")
    summary_path = _steps(parsed.get("summary_path", parsed.get("summaryPath")))
    experience_path = _steps(parsed.get("experience_path", parsed.get("experiencePath")))
    if summary_path == experience_path or _prefix(summary_path, experience_path) or _prefix(experience_path, summary_path):
        raise ValueError("summary and experience must be different blocks")
    merged = deepcopy(original)
    _path_set(merged, summary_path, _lock(_path_get(original, summary_path), parsed.get("summary")))
    _path_set(merged, experience_path, _lock(_path_get(original, experience_path), parsed.get("experience")))
    return {"resume": deepcopy(merged), "cover_letter": letter.strip()}


def _steps(path: object) -> list[str | int]:
    if not isinstance(path, list) or not path:
        raise ValueError("a block path is missing")
    steps: list[str | int] = []
    for step in path:
        if isinstance(step, bool) or not isinstance(step, (str, int)):
            raise ValueError("a block path has a step that is not a key or an index")
        if isinstance(step, str) and not step.strip():
            raise ValueError("a block path has an empty key")
        steps.append(step if isinstance(step, int) else step.strip())
    return steps


def _prefix(left: list, right: list) -> bool:
    return len(left) < len(right) and left == right[: len(left)]


def _path_get(document: object, path: list[str | int]) -> object:
    current = document
    for step in path:
        if isinstance(step, str) and isinstance(current, dict) and step in current:
            current = current[step]
        elif isinstance(step, int) and not isinstance(step, bool) and isinstance(current, list) and 0 <= step < len(current):
            current = current[step]
        else:
            raise ValueError("a block path is not in the resume")
    return current


def _path_set(document: dict, path: list[str | int], value: object) -> None:
    current: object = document
    for step in path[:-1]:
        current = current[step]  # type: ignore[index]
    current[path[-1]] = value  # type: ignore[index]


def _lock(original: object, updated: object) -> object:
    """Keep keys, short facts, and every number. Prose and a new text bullet may change."""
    if isinstance(original, dict) and isinstance(updated, dict):
        return {key: _lock(item, updated[key]) if key in updated else item for key, item in original.items()}
    if isinstance(original, list) and isinstance(updated, list):
        locked = [_lock(item, updated[index]) if index < len(updated) else item for index, item in enumerate(original)]
        for extra in updated[len(original) :]:
            if isinstance(extra, str) and _prose(extra) and not re.search(r"\d", extra):
                locked.append(extra.strip())
        return locked
    if isinstance(original, str) and isinstance(updated, str):
        new = updated.strip()
        if new == original.strip():
            return original
        if _prose(original) and _digits_allowed(new, original):
            return new
    return original


def _prose(text: str) -> bool:
    return len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text)) >= 8


def _digits_allowed(new: str, old: str) -> bool:
    old_runs = Counter(re.findall(r"\d+", old))
    new_runs = Counter(re.findall(r"\d+", new))
    return all(old_runs[token] >= count for token, count in new_runs.items())


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
