from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.domain.clock import as_seoul, parse_instant, seoul_now
import uuid

from app.schemas import (
    AdminApplicationOut,
    AdminProfileOut,
    AdminUserOut,
    AiKeyOut,
    AiPromptOut,
    AiUsageOut,
    SearchOut,
    SessionOut,
    StatisticsColumn,
    StatisticsOut,
    StatisticsRow,
    UserOut,
)
from app.domain.ai_client import AiError, complete_text
from app.store import StoreError, store

DAILY_SPAN = 14
WEEKLY_SPAN = 8
PROVIDERS = {"OpenAI", "Anthropic", "Google"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _valid_email(email: str) -> bool:
    local, separator, domain = email.partition("@")
    return bool(separator and local and "." in domain and not domain.startswith(".") and not domain.endswith("."))


def _app_users() -> list[dict]:
    return [user for user in store.user_records() if user.get("role") != "admin"]


def _user_out(user: dict) -> AdminUserOut:
    profile_ids = [profile["id"] for profile in store.profile_records(user["id"])]
    application_count = store._db.applications.count_documents({"profile_id": {"$in": profile_ids}}) if profile_ids else 0
    return AdminUserOut(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        profile_count=len(profile_ids),
        application_count=application_count,
        deleted_at=user.get("deleted_at"),
    )


def _require_user(user_id: str) -> dict:
    for user in _app_users():
        if user["id"] == user_id:
            return user
    raise StoreError("That user could not be found.", 404)


def _records() -> list[AdminApplicationOut]:
    profiles = {profile["id"]: profile for profile in store.profile_records()}
    users = {user["id"]: user for user in store.user_records()}
    rows = []
    for application in store.application_records():
        profile = profiles.get(application["profile_id"])
        user = users.get(profile["user_id"]) if profile else None
        if not profile or not user or user.get("role") == "admin":
            continue
        rows.append(
            AdminApplicationOut(
                id=application["id"],
                date=application["created_at"],
                profile_id=profile["id"],
                profile_name=profile["name"],
                company=application["company"],
                role=application["job_title"],
                job_link=application["job_link"],
                resume=application["resume_label"],
                has_cover_letter=application["generate_cover_letter"],
                status=application["status"],
                last_update=application["updated_at"],
                handler=application["handler"],
                user_id=user["id"],
                user_name=user["name"],
            )
        )
    rows.sort(key=lambda row: row.date, reverse=True)
    return rows


def _key_out(key: dict) -> AiKeyOut:
    return AiKeyOut(
        id=key["id"],
        name=key["name"],
        provider=key["provider"],
        last_four=key["secret"][-4:],
        project_name=key.get("project_name", ""),
        project_number=key.get("project_number", ""),
        organization_id=key.get("organization_id", ""),
        project_id=key.get("project_id", ""),
        created_at=key["created_at"],
        revoked_at=key["revoked_at"],
        tokens_in=key["tokens_in"],
        tokens_out=key["tokens_out"],
    )


def login(email: str, password: str) -> SessionOut:
    with store._lock:
        normalized = email.strip().lower()
        user = next((item for item in store.user_records() if item["email"] == normalized and item.get("role") == "admin"), None)
        if user is None or user["password"] != password:
            raise StoreError("Email or password is incorrect.")
        token = f"ap_{user['id']}"
        store.bind_token(token, user["id"])
        return SessionOut(token=token, user=UserOut(id=user["id"], name=user["name"], email=user["email"]))


def list_users() -> list[AdminUserOut]:
    with store._lock:
        return [_user_out(user) for user in _app_users()]


def get_user(user_id: str) -> AdminUserOut:
    with store._lock:
        return _user_out(_require_user(user_id))


def update_user(user_id: str, name: str, email: str) -> AdminUserOut:
    with store._lock:
        user = _require_user(user_id)
        cleaned_name = name.strip()
        normalized = email.strip().lower()
        if not cleaned_name:
            raise StoreError("Enter a name.")
        if len(cleaned_name) > 80:
            raise StoreError("Name must be 80 characters or fewer.")
        if not _valid_email(normalized):
            raise StoreError("Enter a valid email.")
        if any(item["email"] == normalized and item["id"] != user["id"] for item in store.user_records()):
            raise StoreError("An account with that email already exists.")
        user["name"] = cleaned_name
        user["email"] = normalized
        store.save_user(user)
        return _user_out(user)


def set_deleted(user_id: str, deleted: bool) -> AdminUserOut:
    with store._lock:
        user = _require_user(user_id)
        user["deleted_at"] = _now() if deleted else None
        store.save_user(user)
        return _user_out(user)


def search(query: str) -> SearchOut:
    with store._lock:
        needle = query.strip().lower()
        if not needle:
            return SearchOut(users=[], applications=[])
        users = [
            _user_out(user)
            for user in _app_users()
            if needle in user["name"].lower() or needle in user["email"].lower()
        ]
        applications = [
            row
            for row in _records()
            if any(needle in value.lower() for value in (row.user_name, row.profile_name, row.company, row.role, row.job_link, row.handler, row.resume))
        ]
        return SearchOut(users=users, applications=applications)


def _monday(day: datetime.date) -> datetime.date:
    return day - timedelta(days=day.weekday())


def statistics(period: str) -> StatisticsOut:
    if period not in {"daily", "weekly"}:
        raise StoreError("Choose daily or weekly.")
    with store._lock:
        today = seoul_now().date()
        if period == "daily":
            days = [today - timedelta(days=DAILY_SPAN - 1 - index) for index in range(DAILY_SPAN)]
            keys = [day.isoformat() for day in days]
        else:
            start = _monday(today) - timedelta(weeks=WEEKLY_SPAN - 1)
            days = [start + timedelta(weeks=index) for index in range(WEEKLY_SPAN)]
            keys = [day.isoformat() for day in days]
        owner = {profile["id"]: profile["user_id"] for profile in store.profile_records()}
        buckets: dict[str, dict[str, int]] = {}
        for application in store.application_records():
            user_id = owner.get(application["profile_id"])
            if not user_id:
                continue
            try:
                moment = as_seoul(parse_instant(application["created_at"]))
            except ValueError:
                continue
            key = moment.date().isoformat() if period == "daily" else _monday(moment.date()).isoformat()
            row = buckets.setdefault(user_id, {})
            row[key] = row.get(key, 0) + 1
        rows = []
        for user in sorted(_app_users(), key=lambda item: item["name"].lower()):
            counts = [buckets.get(user["id"], {}).get(key, 0) for key in keys]
            rows.append(
                StatisticsRow(
                    user_id=user["id"],
                    user_name=user["name"],
                    deleted=bool(user.get("deleted_at")),
                    counts=counts,
                    total=sum(counts),
                )
            )
        label = "%b %-d" if False else "%b %d"
        columns = [
            StatisticsColumn(key=key, label=(f"Week of {datetime.fromisoformat(key).strftime(label)}" if period == "weekly" else datetime.fromisoformat(key).strftime(label)).replace(" 0", " "))
            for key in keys
        ]
        return StatisticsOut(period=period, columns=columns, rows=rows)


def list_applications(filters: dict) -> list[AdminApplicationOut]:
    with store._lock:
        rows = _records()
        user_id = filters.get("user_id") or ""
        profile_id = filters.get("profile_id") or ""
        company = (filters.get("company") or "").strip().lower()
        role = (filters.get("role") or "").strip().lower()
        status = filters.get("status") or ""
        cover_letter = filters.get("cover_letter") or ""
        handler = (filters.get("handler") or "").strip().lower()
        matched = []
        for row in rows:
            if user_id and row.user_id != user_id:
                continue
            if profile_id and row.profile_id != profile_id:
                continue
            if company and company not in row.company.lower():
                continue
            if role and role not in row.role.lower():
                continue
            if status and row.status != status:
                continue
            if cover_letter == "yes" and not row.has_cover_letter:
                continue
            if cover_letter == "no" and row.has_cover_letter:
                continue
            if handler and handler not in row.handler.lower():
                continue
            matched.append(row)
        return matched


def list_profiles(user_id: str) -> list[AdminProfileOut]:
    with store._lock:
        _require_user(user_id)
        return [AdminProfileOut(id=profile["id"], name=profile["name"]) for profile in store.profile_records(user_id)]


def list_usage(key_id: str = "") -> list[AiUsageOut]:
    with store._lock:
        return [AiUsageOut.model_validate(item) for item in store.ai_usage_records(key_id)]


def list_keys() -> list[AiKeyOut]:
    with store._lock:
        return [_key_out(key) for key in store.ai_key_records()]


def create_key(
    name: str,
    provider: str,
    secret: str,
    project_name: str = "",
    project_number: str = "",
    organization_id: str = "",
    project_id: str = "",
) -> AiKeyOut:
    with store._lock:
        cleaned_name = name.strip()
        cleaned_provider = provider.strip()
        cleaned_secret = secret.strip()
        cleaned_project_name = project_name.strip()
        cleaned_project_number = project_number.strip()
        cleaned_organization_id = organization_id.strip()
        cleaned_project_id = project_id.strip()
        if cleaned_provider not in PROVIDERS:
            raise StoreError("Choose a provider.")
        if not cleaned_name:
            raise StoreError("Enter a name for the key.")
        if len(cleaned_secret) < 8:
            raise StoreError("Enter an API key of at least 8 characters.")
        if cleaned_provider == "Google":
            if not cleaned_project_name:
                raise StoreError("Enter the Google Cloud project name.")
            if not cleaned_project_number:
                raise StoreError("Enter the Google Cloud project number.")
        if cleaned_provider == "OpenAI":
            if not cleaned_organization_id:
                raise StoreError("Enter the OpenAI organization ID.")
            if not cleaned_project_id:
                raise StoreError("Enter the OpenAI project ID.")
        key = {
            "id": f"key-{uuid.uuid4().hex[:8]}",
            "name": cleaned_name,
            "provider": cleaned_provider,
            "secret": cleaned_secret,
            "project_name": cleaned_project_name if cleaned_provider == "Google" else "",
            "project_number": cleaned_project_number if cleaned_provider == "Google" else "",
            "organization_id": cleaned_organization_id if cleaned_provider == "OpenAI" else "",
            "project_id": cleaned_project_id if cleaned_provider == "OpenAI" else "",
            "created_at": _now(),
            "revoked_at": None,
            "tokens_in": 0,
            "tokens_out": 0,
        }
        store.save_ai_key(key)
        return _key_out(key)


def test_key(key_id: str, admin_name: str, message: str) -> tuple[str, str]:
    cleaned = message.strip()
    if not cleaned:
        raise StoreError("Enter a message.")
    name = admin_name.strip() or "there"
    with store._lock:
        key = next((item for item in store.ai_key_records() if item["id"] == key_id), None)
        if key is None:
            raise StoreError("That API key could not be found.", 404)
        if key.get("revoked_at"):
            raise StoreError("That API key is revoked.", 409)
        stored = dict(key)
    provider = str(stored.get("provider") or "the")
    greeting = f"Hello, {name}. This is {provider} AI. Nice to meet you."
    instructions = (
        f"The person's name is {name}. The provider is {provider}. "
        "When the person greets you, reply with this sentence and no other words: "
        f"{greeting}"
    )
    try:
        reply, usage = complete_text(stored, instructions, cleaned)
    except AiError as exc:
        raise StoreError(str(exc), exc.status if exc.status < 500 else 502) from exc
    store._record_usage(stored["id"], usage, "API key test")
    return reply, str(usage.get("model") or "")


def revoke_key(key_id: str) -> AiKeyOut:
    with store._lock:
        key = next((item for item in store.ai_key_records() if item["id"] == key_id), None)
        if key is None:
            raise StoreError("That API key could not be found.", 404)
        if not key["revoked_at"]:
            key["revoked_at"] = _now()
            store.save_ai_key(key)
        return _key_out(key)


def list_prompts() -> list[AiPromptOut]:
    with store._lock:
        return [AiPromptOut.model_validate(prompt) for prompt in store.prompt_records()]


def update_prompt(prompt_id: str, body: str) -> AiPromptOut:
    with store._lock:
        prompt = next((item for item in store.prompt_records() if item["id"] == prompt_id), None)
        if prompt is None:
            raise StoreError("That prompt could not be found.", 404)
        cleaned = body.strip()
        if not cleaned:
            raise StoreError("Enter the prompt text.")
        prompt["body"] = cleaned
        prompt["updated_at"] = _now()
        store.save_prompt(prompt)
        return AiPromptOut.model_validate(prompt)
