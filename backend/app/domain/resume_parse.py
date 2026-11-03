import re
from typing import Protocol

MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
DATE_RANGE = re.compile(rf"((?:{MONTHS}) \d{{4}}) - (Present|(?:{MONTHS}) \d{{4}})")
SECTIONS = ("SUMMARY", "SKILLS", "PROFESSIONAL EXPERIENCE", "EDUCATION")
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"\+\d{8,15}")
HEADLINE = re.compile(
    r"(?P<headline>(?:Senior |Staff |Lead |Junior |Principal )?"
    r"(?:Full Stack|Software|Frontend|Backend|Data|AI/ML|DevOps)[A-Za-z ]*"
    r"(?:Engineer|Developer|Analyst|Scientist|Manager))"
    r" (?P<location>[A-Z][A-Za-z .]+(?:, [A-Za-z .]+){1,3})$"
)
LOCATION = re.compile(r" (?P<location>[A-Z][A-Za-z .]+(?:, [A-Za-z .]+){1,3})$")


class ResumeParser(Protocol):
    def parse_master_resume(self, text: str) -> dict: ...


class DemoResumeParser:
    """Stand-in for the model call. Turns extracted resume text into the stored JSON document."""

    def parse_master_resume(self, text: str) -> dict:
        return parse_master_resume(text)


def parse_master_resume(text: str) -> dict:
    text = " ".join(text.split())
    sections = _sections(text)
    header = _header(sections.get("HEADER", ""))
    return {
        "name": header["name"],
        "headline": header["headline"],
        "location": header["location"],
        "phone": header["phone"],
        "email": header["email"],
        "availability": header["availability"],
        "links": header["links"],
        "summary": sections.get("SUMMARY", "").strip(),
        "skills": _skills(sections.get("SKILLS", "")),
        "experience": _experience(sections.get("PROFESSIONAL EXPERIENCE", "")),
        "education": _education(sections.get("EDUCATION", "")),
    }


def _sections(text: str) -> dict[str, str]:
    found: list[tuple[int, int, str]] = []
    for name in SECTIONS:
        match = re.search(rf"\b{re.escape(name)}\b", text)
        if match:
            found.append((match.start(), match.end(), name))
    found.sort()
    sections = {"HEADER": text[: found[0][0]].strip() if found else text.strip()}
    for index, (_, end, name) in enumerate(found):
        stop = found[index + 1][0] if index + 1 < len(found) else len(text)
        sections[name] = text[end:stop].strip()
    return sections


def _header(raw: str) -> dict:
    parts = [part.strip(" |") for part in raw.split("|") if part.strip(" |")]
    email = ""
    phone = ""
    availability = ""
    links: list[dict[str, str]] = []
    identity = parts[0] if parts else raw.strip()
    for part in parts[1:]:
        email_match = EMAIL.search(part)
        phone_match = PHONE.search(part)
        if email_match:
            email = email_match.group(0)
        elif phone_match:
            phone = phone_match.group(0)
        elif part.lower().startswith("based"):
            availability = part
        else:
            links.append({"label": part, "url": ""})
    name, headline, location = _identity(identity)
    return {
        "name": name,
        "headline": headline,
        "location": location,
        "phone": phone,
        "email": email,
        "availability": availability,
        "links": links,
    }


def _identity(identity: str) -> tuple[str, str, str]:
    match = HEADLINE.search(identity.strip())
    if not match:
        return identity.strip(), "", ""
    headline = match.group("headline").strip()
    location = match.group("location").strip()
    name = identity[: match.start()].strip()
    return name, headline, location


def _skills(raw: str) -> list[dict]:
    groups: list[dict] = []
    for chunk in raw.split("•"):
        if ":" not in chunk:
            continue
        label, items = chunk.split(":", 1)
        names = [item.strip(" .") for item in items.split(",") if item.strip(" .")]
        if label.strip() and names:
            groups.append({"group": label.strip(), "items": names})
    return groups


def _experience(raw: str) -> list[dict]:
    matches = list(DATE_RANGE.finditer(raw))
    jobs: list[dict] = []
    pending_company = ""
    for index, match in enumerate(matches):
        region_end = matches[index + 1].start() if index + 1 < len(matches) else len(raw)
        region = raw[match.end() : region_end].strip()
        parts = [part.strip() for part in region.split("•") if part.strip()]
        head = parts[0] if parts else ""
        highlights = parts[1:]
        next_company = ""
        if highlights and index + 1 < len(matches):
            highlight, next_company = _peel_company(highlights[-1])
            highlights[-1] = highlight
        company = raw[: match.start()] if index == 0 else pending_company
        pending_company = next_company
        title, location = _title_location(head)
        end = match.group(2)
        jobs.append(
            {
                "company": " ".join(company.split()),
                "title": title,
                "location": location,
                "start": match.group(1),
                "end": "" if end == "Present" else end,
                "current": end == "Present",
                "highlights": highlights,
            }
        )
    return [job for job in jobs if job["company"]]


def _peel_company(highlight: str) -> tuple[str, str]:
    text = highlight.strip()
    found: re.Match[str] | None = None
    for candidate in re.finditer(r"\.\s+([A-Z].{0,80}?\.?)$", text):
        company = candidate.group(1).strip()
        if company.count(" ") <= 8:
            found = candidate
    if found is None:
        return text, ""
    return text[: found.start() + 1].strip(), found.group(1).strip()


def _title_location(head: str) -> tuple[str, str]:
    match = LOCATION.search(head.strip())
    if not match:
        return head.strip(), ""
    return head.strip()[: match.start()].strip(), match.group("location").strip()


def _education(raw: str) -> list[dict]:
    schools: list[dict] = []
    matches = list(DATE_RANGE.finditer(raw))
    for index, match in enumerate(matches):
        previous_end = matches[index - 1].end() if index else 0
        school = " ".join(raw[previous_end : match.start()].split())
        degree = " ".join(raw[match.end() : (matches[index + 1].start() if index + 1 < len(matches) else len(raw))].split())
        if school:
            schools.append({"school": school, "degree": degree, "start": match.group(1), "end": match.group(2)})
    return schools
