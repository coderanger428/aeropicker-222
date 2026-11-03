from app.domain.clock import as_seoul, parse_instant
from app.domain.text import extract_keywords, skill_label, slugify


def _topic(keywords: list[str], index: int, fallback: str) -> str:
    if index < len(keywords):
        return keywords[index]
    return fallback


def build_resume(*, candidate_name: str, role_label: str, company: str, job_title: str, keywords: list[str]) -> dict:
    first = _topic(keywords, 0, "the core responsibilities")
    second = _topic(keywords, 1, "delivery")
    third = _topic(keywords, 2, "collaboration")
    skills = [skill_label(word) for word in keywords] or ["Communication", "Delivery", "Problem solving"]
    return {
        "candidate_name": candidate_name,
        "role_line": role_label,
        "summary": (
            f"Hands-on {role_label.lower()} applying {first} and {second} to production work. "
            f"This draft is shaped for the {job_title} role at {company}."
        ),
        "skills": skills,
        "experience": [
            {
                "title": role_label,
                "org": "Recent engagement",
                "points": [
                    f"Led work around {first}, aligning the implementation with what {company} described for {job_title}.",
                    f"Broke {second} into reviewable pieces and shipped them with the team.",
                    f"Partnered with adjacent teams on {third}, keeping the scope tied to the job description.",
                ],
            },
            {
                "title": "Software engineer",
                "org": "Earlier experience",
                "points": [
                    f"Built and maintained features where {first} mattered to the people using them.",
                    "Left notes and handoffs clear enough for the next person to extend the work.",
                ],
            },
        ],
    }


def build_cover_letter(*, candidate_name: str, role_label: str, company: str, job_title: str, keywords: list[str]) -> dict:
    first = _topic(keywords, 0, "the work in the job description")
    second = _topic(keywords, 1, "shipping reliable software")
    return {
        "subject": job_title,
        "salutation": f"Dear {company} hiring team,",
        "paragraphs": [
            f"I am applying for the {job_title} role. The description lines up with the kind of work I want to keep doing, especially {first}.",
            f"In recent roles I have taken {role_label.lower()} work from a rough brief to something other people could run. A representative piece is the work around {second}.",
            f"I would like to talk about how that experience can help {company}. Thank you for reading.",
        ],
        "closing": "Sincerely,",
        "signature": candidate_name,
    }


def draft_answers(questions: list[str], *, candidate_name: str, company: str, job_title: str, keywords: list[str]) -> list[dict]:
    topic = _topic(keywords, 0, "the work described in the posting")
    return [
        {
            "id": f"qa-{index + 1}",
            "question": question,
            "answer": (
                f"{candidate_name} — for the {job_title} role at {company}: "
                f"I would answer from specific work related to {topic}. {direct_reply(question, company)}"
            ),
        }
        for index, question in enumerate(questions)
    ]


def direct_reply(question: str, company: str) -> str:
    normalized = question.lower()
    if "year" in normalized:
        return "I would state the years that match the requirement and name the project that best supports them."
    if any(word in normalized for word in ("salary", "compensation", "pay")):
        return "I would share a range after confirming the band for this role, and stay open on the rest of the package."
    if any(word in normalized for word in ("sponsor", "authoriz", "visa")):
        return "I would answer the work-authorization question directly for this profile."
    if "start" in normalized or "notice" in normalized:
        return "I would give a realistic start date and the notice period I need."
    if "why" in normalized:
        return f"I would connect my interest to what {company} is hiring for, using the language of the job description."
    return "I would answer in the first person, keep it specific, and mirror the terms used in the question."


def _format_date(iso: str) -> str:
    try:
        parsed = as_seoul(parse_instant(iso))
    except ValueError:
        return iso
    return f"{parsed:%b} {parsed.day}, {parsed.year}"


def build_export_files(application: dict) -> list[dict]:
    base = "-".join(
        slugify(part)
        for part in (application["candidate_name"], application["company"], application["job_title"])
    )
    resume = application["resume"]
    lines = [
        resume["candidate_name"],
        resume["role_line"],
        f"Prepared for {application['job_title']} at {application['company']}",
        "",
        "Summary",
        resume["summary"],
        "",
        "Skills",
        ", ".join(resume["skills"]),
        "",
        "Experience",
    ]
    for block in resume["experience"]:
        lines.extend([block["title"], block["org"], *[f"- {point}" for point in block["points"]], ""])
    files = [{"filename": f"{base}-resume.pdf", "title": "Resume", "lines": lines}]
    letter = application["cover_letter"]
    if letter:
        letter_lines = [
            _format_date(application["created_at"]),
            letter["signature"],
            f"Re: {letter['subject']}",
            "",
            letter["salutation"],
            "",
        ]
        for paragraph in letter["paragraphs"]:
            letter_lines.extend([paragraph, ""])
        letter_lines.extend([letter["closing"], letter["signature"]])
        files.append({"filename": f"{base}-cover-letter.pdf", "title": "Cover letter", "lines": letter_lines})
    return files


def keywords_for(job_description: str) -> list[str]:
    return extract_keywords(job_description)
