"""Classic template.

One column, US Letter, Source Sans 3. The resume follows the master layout:
centered name, headline, and contact lines, then summary, grouped skills,
jobs with the company and dates on one line, and education. Cover-letter
bullets render only when the letter JSON includes them.
"""

from __future__ import annotations

import re
from pathlib import Path

from app.domain.clock import as_seoul, parse_instant
from app.domain.resume_document import document_nodes, is_legacy_resume

from fpdf import FPDF

FONT_DIR = Path(__file__).resolve().parent / "fonts"
NAVY = (26, 26, 26)


LOOKS = {
    "classic": {"name": 25, "align": "C", "contact": "pipes", "rule": True, "body": 10, "job": 10.5},
    "plain": {"name": 20, "align": "L", "contact": "lines", "rule": False, "body": 11, "job": 11},
    "compact": {"name": 16, "align": "L", "contact": "inline", "rule": True, "body": 9, "job": 9.5},
}


def render_classic(kind: str, application: dict, style: str = "classic") -> bytes:
    pdf = _ClassicPdf(style)
    if kind == "cover-letter":
        pdf.letter(application)
    else:
        pdf.resume(application)
    return bytes(pdf.output())


def render_plain(kind: str, application: dict) -> bytes:
    return render_classic(kind, application, "plain")


def render_compact(kind: str, application: dict) -> bytes:
    return render_classic(kind, application, "compact")


def document_files(application: dict) -> list[dict]:
    source = resume_source(application)
    name = _profile_header(application)["name"] or "Resume"
    headline = ""
    if is_legacy_resume(source):
        headline = plain_headline(source.get("headline") or "")
    headline = headline or application.get("resume_label") or "Resume"
    files = [
        {
            "kind": "resume",
            "filename": f"{file_token(name)}_{file_token(headline)}.pdf",
            "title": "Resume",
            "lines": [],
        }
    ]
    if application.get("cover_letter"):
        job = application.get("job_title") or "Role"
        company = application.get("company") or "Company"
        files.append(
            {
                "kind": "cover-letter",
                "filename": f"{file_token(name)}_{file_token(job)}_{file_token(company)}_Letter.pdf",
                "title": "Cover letter",
                "lines": [],
            }
        )
    return files


def file_token(value: str) -> str:
    parts = re.findall(r"[A-Za-z0-9]+", value or "")
    return "_".join(parts)[:72] or "Document"


def plain_headline(value: str) -> str:
    text = (value or "").strip()
    if len(text) >= 2 and text.startswith("[") and text.endswith("]"):
        return text[1:-1].strip()
    return text


def resume_source(application: dict) -> dict:
    """The document saved with the application. A converted resume is rendered as stored."""
    packet = application.get("tailor_input") if isinstance(application.get("tailor_input"), dict) else {}
    master = packet.get("master_resume") if isinstance(packet.get("master_resume"), dict) else None
    legacy = packet.get("tailored_resume") if isinstance(packet.get("tailored_resume"), dict) else None
    summary = packet.get("tailored_summary")
    experience = packet.get("tailored_experience")
    if master and not is_legacy_resume(master) and not is_legacy_resume(legacy) and summary is None and experience is None:
        return legacy or master
    if summary is None and legacy:
        summary = legacy.get("summary")
    if experience is None and legacy:
        experience = legacy.get("experience")
    if master or legacy:
        source = dict(master or legacy)
        origin = master or legacy or {}
        source["headline"] = origin.get("headline") or ""
        source["availability"] = origin.get("availability") or ""
        source["skills"] = origin.get("skills") or []
        source["education"] = origin.get("education") or []
        source["sections"] = origin.get("sections") or []
        if isinstance(summary, str):
            source["summary"] = summary
        if isinstance(experience, list):
            source["experience"] = experience
        return source
    resume = application.get("resume") or {}
    skills = resume.get("skills") or []
    return {
        "name": resume.get("candidate_name") or application.get("candidate_name") or "",
        "headline": resume.get("role_line") or "",
        "location": "",
        "phone": "",
        "email": "",
        "links": [],
        "summary": resume.get("summary") or "",
        "skills": [{"group": "Skills", "items": skills}] if skills else [],
        "experience": [
            {
                "title": item.get("title") or "",
                "company": item.get("org") or "",
                "location": "",
                "start": "",
                "end": "",
                "current": False,
                "highlights": item.get("points") or [],
            }
            for item in resume.get("experience") or []
        ],
        "education": [],
    }


_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def format_period(value: str) -> str:
    """Print a stored YYYY-MM value as 'Nov 2016'. Leave any other text as written."""
    text = (value or "").strip()
    if not text:
        return ""
    if text.lower() == "present":
        return "Present"
    match = re.fullmatch(r"(\d{4})-(\d{2})", text)
    if match is None:
        return text
    month = int(match.group(2))
    if not 1 <= month <= 12:
        return text
    return f"{_MONTHS[month - 1]} {match.group(1)}"


def letter_date(created_at: str) -> str:
    try:
        moment = as_seoul(parse_instant(created_at or ""))
    except ValueError:
        return ""
    day = moment.day
    if 11 <= day % 100 <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix} {moment.strftime('%B')} {moment.year}"


def _dates(start: str, end: str, current: bool = False) -> str:
    finish = "Present" if current else format_period(end)
    return " - ".join(part for part in (format_period(start), finish) if part)


def _profile_header(application: dict) -> dict:
    """Contact header from the profile. The resume JSON does not supply these fields."""
    contact = application.get("profile_contact")
    source = contact if isinstance(contact, dict) else {}
    links = []
    for link in source.get("links") or []:
        if not isinstance(link, dict):
            continue
        url = str(link.get("url") or "").strip()
        if url:
            links.append(url)
    return {
        "name": str(source.get("name") or "").strip(),
        "location": str(source.get("location") or "").strip(),
        "phone": str(source.get("phone") or "").strip(),
        "email": str(source.get("email") or "").strip(),
        "links": links,
    }


def _link_href(url: str) -> str:
    text = url.strip()
    if text.lower().startswith(("http://", "https://")):
        return text
    return f"https://{text}"


def _pipes(parts: list[str], trailing: bool = False) -> str:
    bits = [part.strip() for part in parts if part and part.strip()]
    if not bits:
        return ""
    text = " | ".join(bits)
    return f"{text} |" if trailing else text


class _ClassicPdf(FPDF):
    def __init__(self, style: str = "classic") -> None:
        super().__init__(format="Letter", unit="mm")
        self.look = LOOKS.get(style, LOOKS["classic"])
        margin = 12.7 if style != "compact" else 10
        self.set_auto_page_break(auto=True, margin=margin)
        self.set_margins(margin, margin, margin)
        self.add_font("SourceSans", "", str(FONT_DIR / "SourceSans3-Regular.ttf"))
        self.add_font("SourceSans", "B", str(FONT_DIR / "SourceSans3-Bold.ttf"))
        self.add_font("SourceSans", "I", str(FONT_DIR / "SourceSans3-It.ttf"))
        self.add_page()
        self.set_text_color(*NAVY)

    def resume(self, application: dict) -> None:
        source = resume_source(application)
        header = _profile_header(application)
        if not is_legacy_resume(source):
            self._document_resume(source, header)
            return
        self._legacy_resume(source, header)

    def _document_resume(self, source: dict, header: dict) -> None:
        look = self.look
        align = look["align"]
        name = header["name"] or "Resume"
        self.set_font("SourceSans", "B", look["name"])
        self._block(8 if look["name"] < 20 else 9, name, align=align)
        self._draw_contact(header, "")
        skip = {bit.strip().lower() for bit in (header["name"], header["location"], header["phone"], header["email"], *header["links"]) if bit and str(bit).strip()}
        for node in document_nodes(source, skip):
            self._draw_node(node)

    def _draw_node(self, node: dict) -> None:
        kind = node.get("type")
        if kind == "section":
            self._section(str(node.get("heading") or ""), as_written=True)
            for child in node.get("children") or []:
                self._draw_node(child)
            return
        if kind == "entry":
            for child in node.get("children") or []:
                self._draw_node(child)
            self.ln(1.2)
            return
        if kind == "bullets":
            for item in node.get("items") or []:
                self._bullet(str(item), self.look["body"], 4.6)
            return
        if kind == "field":
            self._labeled(str(node.get("label") or ""), str(node.get("value") or ""))
            return
        text = str(node.get("text") or "").strip()
        if text:
            self.set_font("SourceSans", "", self.look["body"])
            self._block(4.6, text)

    def _labeled(self, label: str, value: str) -> None:
        self.set_font("SourceSans", "B", self.look["body"])
        self.write(4.6, f"{label}: ")
        self.set_font("SourceSans", "", self.look["body"])
        self.write(4.6, value)
        self.ln(5.2)

    def _legacy_resume(self, source: dict, header: dict) -> None:
        look = self.look
        align = look["align"]
        name = header["name"] or "Resume"
        headline = plain_headline(source.get("headline") or "")
        self.set_font("SourceSans", "B", look["name"])
        self._block(8 if look["name"] < 20 else 9, name, align=align)
        if headline:
            self.set_font("SourceSans", "", 9)
            self._block(4.2, headline, align=align)
        self._draw_contact(header, (source.get("availability") or "").strip())

        summary = (source.get("summary") or "").strip()
        if summary:
            self._section("Summary")
            self.set_font("SourceSans", "", look["body"])
            self._block(4.6, summary)

        skills = [
            group
            for group in source.get("skills") or []
            if isinstance(group, dict) and (group.get("items") or [])
        ]
        if skills:
            self._section("Skills")
            for group in skills:
                items = [str(item).strip() for item in group.get("items") or [] if str(item).strip()]
                if not items:
                    continue
                label = (group.get("group") or "Skills").strip()
                self._skill(label, ", ".join(items))

        jobs = [job for job in source.get("experience") or [] if isinstance(job, dict)]
        if jobs:
            self._section("Professional Experience")
            for job in jobs:
                self._ends(
                    (job.get("company") or "").strip(),
                    _dates(job.get("start") or "", job.get("end") or "", bool(job.get("current"))),
                    look["job"],
                    "B",
                    "B",
                )
                title = (job.get("title") or "").strip()
                place = (job.get("location") or "").strip()
                if title or place:
                    self._ends(title, place, look["job"])
                for highlight in job.get("highlights") or []:
                    text = str(highlight).strip()
                    if text:
                        self._bullet(text, look["body"], 4.6)
                self.ln(1.2)

        schools = [school for school in source.get("education") or [] if isinstance(school, dict)]
        if schools:
            self._section("Education")
            for school in schools:
                self._ends(
                    (school.get("school") or "").strip(),
                    _dates(school.get("start") or "", school.get("end") or ""),
                    look["job"],
                    "B",
                    "B",
                )
                degree = (school.get("degree") or "").strip()
                if degree:
                    self.set_font("SourceSans", "", look["body"])
                    self._block(4.6, degree)

        for block in source.get("sections") or []:
            if not isinstance(block, dict):
                continue
            heading = str(block.get("heading") or "").strip()
            lines = [str(line).strip() for line in block.get("lines") or [] if str(line).strip()]
            if not heading and not lines:
                continue
            if heading:
                self._section(heading)
            for line in lines:
                self.set_font("SourceSans", "", look["body"])
                if line[:1] in {"-", "•", "·"}:
                    self._bullet(line.lstrip("-•· ").strip(), look["body"], 4.6)
                else:
                    self._block(4.6, line)

    def _draw_contact(self, header: dict, availability: str) -> None:
        align = self.look["align"]
        mode = self.look["contact"]
        facts = [header["location"], header["phone"], header["email"]]
        links = [(url, _link_href(url)) for url in header["links"]]
        self.set_font("SourceSans", "", 9)
        if mode == "lines":
            for fact in facts:
                if fact:
                    self._block(4.2, fact, align=align)
            if availability:
                self._block(4.2, availability, align=align)
            for url, href in links:
                self._link_line(url, href, align)
            return
        if mode == "inline":
            pieces = [(fact, "") for fact in facts if fact]
            if availability:
                pieces.append((availability, ""))
            pieces.extend(links)
            if pieces:
                self._flow_pieces(pieces, 9, 4.2, align)
            return
        contact = _pipes(facts, trailing=True)
        if contact:
            self._block(4.2, contact, align=align)
        pieces: list[tuple[str, str]] = []
        if availability:
            pieces.append((availability, ""))
        pieces.extend(links)
        if pieces:
            self._flow_pieces(pieces, 9, 4.2, align)

    def _link_line(self, text: str, href: str, align: str) -> None:
        self.set_font("SourceSans", "U", 9)
        width = self.get_string_width(text)
        if align == "C":
            self.set_x(self.l_margin + max(0, (self.epw - width) / 2))
        self.cell(width, 4.2, text, link=href, new_x="LMARGIN", new_y="NEXT")
        self.set_font("SourceSans", "", 9)

    def letter(self, application: dict) -> None:
        letter = application.get("cover_letter") or {}
        header = _profile_header(application)
        name = header["name"] or "Resume"
        self.set_font("SourceSans", "B", 16 if self.look["name"] < 20 else 19)
        self._block(8, name)
        bits = [bit for bit in (header["email"], header["phone"], header["location"]) if bit]
        self.set_font("SourceSans", "", 11)
        if self.look["contact"] == "lines":
            for bit in bits:
                self._block(5.2, bit)
        elif bits:
            joiner = "  ·  " if self.look["contact"] == "pipes" else " | "
            self._block(5.2, joiner.join(bits))
        when = letter_date(application.get("created_at") or "")
        if when:
            self.ln(3)
            self.set_font("SourceSans", "", 11)
            self._block(5.4, when)
        salutation = (letter.get("salutation") or "").strip()
        if salutation:
            self.ln(4)
            self.set_font("SourceSans", "", 11)
            self._block(5.4, salutation)
        for paragraph in letter.get("paragraphs") or []:
            text = str(paragraph).strip()
            if not text:
                continue
            self.ln(3)
            self.set_font("SourceSans", "", 11)
            self._block(5.4, text)
        for bullet in letter.get("bullets") or []:
            if not isinstance(bullet, dict):
                continue
            text = str(bullet.get("text") or "").strip()
            label = str(bullet.get("label") or "").strip()
            if not text and not label:
                continue
            self._letter_bullet(label, text)
        closing = (letter.get("closing") or "").strip()
        signature = (letter.get("signature") or "").strip()
        line = closing
        if signature and signature not in closing:
            line = f"{closing} {signature}".strip()
        if line:
            self.ln(5)
            self.set_font("SourceSans", "", 11)
            self._block(5.4, line)

    def _ends(self, left: str, right: str, size: float, left_style: str = "", right_style: str = "") -> None:
        self.set_font("SourceSans", right_style, size)
        right_w = self.get_string_width(right) + 1.2 if right else 0
        self.set_font("SourceSans", left_style, size)
        if right and self.get_string_width(left) + right_w + 4 <= self.epw:
            self.cell(self.epw - right_w, 4.8, left, new_x="RIGHT", new_y="TOP")
            self.set_font("SourceSans", right_style, size)
            self.cell(right_w, 4.8, right, align="R", new_x="LMARGIN", new_y="NEXT")
            return
        if left:
            self.multi_cell(0, 4.8, left, align="L", new_x="LMARGIN", new_y="NEXT")
        if right:
            self.set_font("SourceSans", right_style, size)
            self.cell(0, 4.8, right, align="R", new_x="LMARGIN", new_y="NEXT")

    def _flow_pieces(self, pieces: list[tuple[str, str]], size: float, line: float, align: str) -> None:
        """One row of plain text and link text. Each link is (visible url, href)."""
        separator = " | "
        shown: list[tuple[str, str]] = []
        for index, (text, href) in enumerate(pieces):
            if index:
                shown.append((separator, ""))
            shown.append((text, href))
        widths = []
        for text, href in shown:
            self.set_font("SourceSans", "U" if href else "", size)
            widths.append((text, href, self.get_string_width(text)))
        total = sum(width for _, _, width in widths)
        offset = max(0, (self.epw - total) / 2) if align == "C" else 0
        self.set_x(self.l_margin + offset)
        for text, href, width in widths:
            self.set_font("SourceSans", "U" if href else "", size)
            self.cell(width, line, text, link=href, new_x="RIGHT", new_y="TOP")
        self.ln(line)

    def _skill(self, label: str, items: str) -> None:
        self.set_font("SourceSans", "", 10)
        self.cell(4.2, 4.6, "•", new_x="RIGHT", new_y="TOP")
        self.set_font("SourceSans", "B", 10)
        self.write(4.6, f"{label}: ")
        self.set_font("SourceSans", "", 10)
        self.write(4.6, items)
        self.ln(5.2)

    def _block(self, line: float, text: str, align: str = "L") -> None:
        self.multi_cell(0, line, text, align=align, new_x="LMARGIN", new_y="NEXT")

    def _section(self, title: str, *, as_written: bool = False) -> None:
        self.ln(2.4 if self.look["name"] < 20 else 3.2)
        self.set_font("SourceSans", "B", 10)
        self.cell(0, 5.2, title if as_written else title.upper(), new_x="LMARGIN", new_y="NEXT")
        if self.look["rule"]:
            y = self.get_y()
            self.set_draw_color(*NAVY)
            self.set_line_width(0.3)
            self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(1.8)

    def _bullet(self, text: str, size: float, line: float) -> None:
        self.set_font("SourceSans", "", size)
        self.set_x(self.l_margin)
        self.cell(4.2, line, "•", new_x="RIGHT", new_y="TOP")
        self.multi_cell(0, line, text, align="L", new_x="LMARGIN", new_y="NEXT")

    def _letter_bullet(self, label: str, text: str) -> None:
        shown = label
        if shown and not shown.endswith(":"):
            shown = f"{shown}:"
        self.ln(1.6)
        self.set_x(self.l_margin)
        self.set_font("SourceSans", "", 11)
        self.cell(5, 5.4, "•", new_x="RIGHT", new_y="TOP")
        if shown:
            self.set_font("SourceSans", "B", 11)
            self.write(5.4, f"{shown} ")
        self.set_font("SourceSans", "", 11)
        self.write(5.4, text)
        self.ln(5.8)
