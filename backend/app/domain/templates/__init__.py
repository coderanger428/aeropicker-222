from app.domain.templates.classic import document_files, render_classic

TEMPLATES = {
    "classic": {"id": "classic", "label": "Classic"},
}

RENDERERS = {
    "classic": render_classic,
}


def list_templates() -> list[dict]:
    return [dict(item) for item in TEMPLATES.values()]


def render_pdf(template_id: str, kind: str, application: dict) -> bytes:
    renderer = RENDERERS.get(template_id, render_classic)
    return renderer(kind, application)
