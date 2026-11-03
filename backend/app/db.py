import os
from pathlib import Path

from bson.binary import Binary
from pymongo import MongoClient
from pymongo.database import Database

_client: MongoClient | None = None


def _load_env() -> None:
    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"'))


def database() -> Database:
    global _client
    if _client is None:
        _load_env()
        uri = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017")
        name = os.environ.get("MONGODB_DB", "aeropicker")
        _client = MongoClient(uri, serverSelectionTimeoutMS=4000)
        _client.admin.command("ping")
        db = _client[name]
        _ensure_indexes(db)
    name = os.environ.get("MONGODB_DB", "aeropicker")
    return _client[name]


def _ensure_indexes(db: Database) -> None:
    db.users.create_index("email", unique=True)
    db.profiles.create_index("user_id")
    db.profiles.create_index([("user_id", 1), ("position", 1)])
    db.resumes.create_index([("profile_id", 1), ("role_key", 1)], unique=True)
    db.applications.create_index([("profile_id", 1), ("created_at", -1)])
    db.applications.create_index(
        "profile_id",
        unique=True,
        partialFilterExpression={"open": True},
        name="one_open_per_profile",
    )
    db.sessions.create_index("user_id")
    db.ai_usage.create_index([("key_id", 1), ("at", -1)])
    db.prompts.create_index("position")


def record(document: dict | None, *, pdf: bool = False) -> dict | None:
    if document is None:
        return None
    item = {key: value for key, value in document.items() if key != "_id"}
    item["id"] = document["_id"]
    raw_pdf = item.pop("pdf", None)
    if pdf and raw_pdf is not None:
        item["pdf_bytes"] = bytes(raw_pdf)
    return item


def document(item: dict, *, pdf: bool = False) -> dict:
    stored = {key: value for key, value in item.items() if key not in {"id", "pdf_bytes"}}
    stored["_id"] = item["id"]
    if pdf:
        stored["pdf"] = Binary(item.get("pdf_bytes") or b"")
    return stored
