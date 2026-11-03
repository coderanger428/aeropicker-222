from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_TEXT_CHARS = 400_000


def normalize_pdf_text(raw: str) -> str:
    text = raw.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in text.split("\n")]
    collapsed = "\n".join(lines)
    while "\n\n\n" in collapsed:
        collapsed = collapsed.replace("\n\n\n", "\n\n")
    return collapsed.strip()


def resume_excerpt(text: str) -> str:
    flat = " ".join(text.split())
    if len(flat) <= 180:
        return flat
    return flat[:179].rstrip() + "…"


def extract_pdf_text(payload: bytes) -> str:
    if not payload.startswith(b"%PDF-"):
        raise ValueError("That file is not a PDF.")
    try:
        reader = PdfReader(BytesIO(payload))
    except PdfReadError as exc:
        raise ValueError("That file is not a readable PDF.") from exc
    if reader.is_encrypted:
        try:
            unlocked = reader.decrypt("")
        except Exception as exc:
            raise ValueError("This PDF is encrypted. Upload an unlocked PDF.") from exc
        if unlocked == 0:
            raise ValueError("This PDF is encrypted. Upload an unlocked PDF.")
    pages: list[str] = []
    try:
        for page in reader.pages:
            pages.append(page.extract_text() or "")
    except PdfReadError as exc:
        raise ValueError("Could not read text from that PDF.") from exc
    text = normalize_pdf_text("\n".join(pages))
    if not text:
        raise ValueError("This PDF has no extractable text. Upload a text-based PDF, not a scan.")
    return text[:MAX_TEXT_CHARS]
