from app.domain.templates.classic import document_files, render_classic, render_compact, render_plain

TEMPLATES = {
    "classic": {"id": "classic", "label": "Classic"},
    "plain": {"id": "plain", "label": "Plain"},
    "compact": {"id": "compact", "label": "Compact"},
}

RENDERERS = {
    "classic": render_classic,
    "plain": render_plain,
    "compact": render_compact,
}


def list_templates() -> list[dict]:
    return [dict(item) for item in TEMPLATES.values()]


def render_pdf(template_id: str, kind: str, application: dict) -> bytes:
    renderer = RENDERERS.get(template_id, render_classic)
    return renderer(kind, application)
