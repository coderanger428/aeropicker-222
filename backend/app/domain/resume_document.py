"""Resume JSON as the document wrote it, plus the older fixed shape still stored on earlier applications."""

from __future__ import annotations

import re

_LEGACY_KEYS = {"name", "headline", "summary", "skills", "experience", "education"}
_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_DATE = re.compile(r"\b\d{4}-\d{2}\b")


def is_legacy_resume(content: object) -> bool:
    """True for a resume saved in the old fixed shape. A converted document uses the headings from the page."""
    if not isinstance(content, dict) or not _LEGACY_KEYS <= content.keys():
        return False
    skills = content.get("skills")
    experience = content.get("experience")
    if not isinstance(skills, list) or not isinstance(experience, list):
        return False
    if any(not isinstance(item, dict) or "items" not in item for item in skills):
        return False
    if any(not isinstance(item, dict) or "company" not in item or "highlights" not in item for item in experience):
        return False
    return True


def as_resume_document(parsed: object) -> dict:
    """Accept the converted object. There is no field list to satisfy."""
    if not isinstance(parsed, dict) or not parsed:
        raise ValueError("the model did not return the resume object")
    return parsed


def document_nodes(value: object, skip: set[str]) -> list[dict]:
    """Turn the converted resume into render nodes. Keys stay as printed."""
    if isinstance(value, dict):
        nodes = []
        for key, item in value.items():
            node = _keyed(str(key), item, skip)
            if node:
                nodes.append(node)
        return nodes
    return _nodes(value, skip)


def _keyed(key: str, item: object, skip: set[str]) -> dict | None:
    if isinstance(item, dict):
        children = document_nodes(item, skip)
        if not children:
            return None
        return {"type": "section", "heading": key, "children": children}
    if isinstance(item, list):
        if item and all(isinstance(entry, dict) for entry in item):
            children = []
            for entry in item:
                body = document_nodes(entry, skip)
                if body:
                    children.append({"type": "entry", "children": body})
            if not children:
                return None
            return {"type": "section", "heading": key, "children": children}
        children = _list_children(item, skip)
        if not children:
            return None
        return {"type": "section", "heading": key, "children": children}
    shown = _show(item, skip)
    if not shown:
        return None
    return {"type": "field", "label": key, "value": shown}


def _nodes(value: object, skip: set[str]) -> list[dict]:
    if isinstance(value, dict):
        return document_nodes(value, skip)
    if isinstance(value, list):
        return _list_children(value, skip)
    shown = _show(value, skip)
    return [{"type": "text", "text": shown}] if shown else []


def _list_children(items: list, skip: set[str]) -> list[dict]:
    bullets = []
    children = []
    for item in items:
        if isinstance(item, str):
            shown = _show(item, skip)
            if shown:
                bullets.append(shown)
        else:
            children.extend(_nodes(item, skip))
    if bullets:
        children.insert(0, {"type": "bullets", "items": bullets})
    return children


def _show(value: object, skip: set[str]) -> str:
    if isinstance(value, bool) or value is None:
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if not isinstance(value, str):
        return ""
    text = value.strip()
    if not text or text.lower() in skip:
        return ""
    if text.lower() == "present":
        return "Present"
    return _DATE.sub(lambda match: _month(match.group(0)), text)


def _month(value: str) -> str:
    year, month = value.split("-", 1)
    index = int(month)
    if not 1 <= index <= 12:
        return value
    return f"{_MONTHS[index - 1]} {year}"
