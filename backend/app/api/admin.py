from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CurrentAdmin, raise_store_error
from app.schemas import (
    AdminApplicationOut,
    AdminProfileOut,
    AdminUserOut,
    AdminUserUpdate,
    AiKeyIn,
    AiKeyOut,
    AiPromptOut,
    AiTestIn,
    AiTestOut,
    AiUsageOut,
    DeletedIn,
    LoginIn,
    PromptUpdate,
    SearchOut,
    SessionOut,
    StatisticsOut,
    UserOut,
)
from app.store import StoreError, store
from app.store.admin_ops import (
    create_key,
    get_user,
    list_applications,
    list_keys,
    list_profiles,
    list_usage,
    list_prompts,
    list_users,
    login,
    revoke_key,
    test_key,
    search,
    set_deleted,
    statistics,
    update_prompt,
    update_user,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login", response_model=SessionOut)
def admin_login(body: LoginIn) -> SessionOut:
    try:
        return login(body.email, body.password)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/logout", status_code=204)
def admin_logout(admin: CurrentAdmin) -> None:
    store.logout(admin["token"])


@router.get("/me", response_model=UserOut)
def admin_me(admin: CurrentAdmin) -> UserOut:
    return UserOut(id=admin["id"], name=admin["name"], email=admin["email"])


@router.get("/users", response_model=list[AdminUserOut])
def users(_: CurrentAdmin) -> list[AdminUserOut]:
    return list_users()


@router.get("/users/{user_id}", response_model=AdminUserOut)
def user(user_id: str, _: CurrentAdmin) -> AdminUserOut:
    try:
        return get_user(user_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.put("/users/{user_id}", response_model=AdminUserOut)
def save_user(user_id: str, body: AdminUserUpdate, _: CurrentAdmin) -> AdminUserOut:
    try:
        return update_user(user_id, body.name, body.email)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/users/{user_id}/deleted", response_model=AdminUserOut)
def mark_deleted(user_id: str, body: DeletedIn, _: CurrentAdmin) -> AdminUserOut:
    try:
        return set_deleted(user_id, body.deleted)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/users/{user_id}/profiles", response_model=list[AdminProfileOut])
def profiles(user_id: str, _: CurrentAdmin) -> list[AdminProfileOut]:
    try:
        return list_profiles(user_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/search", response_model=SearchOut)
def global_search(_: CurrentAdmin, q: str = "") -> SearchOut:
    try:
        return search(q)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/statistics", response_model=StatisticsOut)
def stats(_: CurrentAdmin, period: str = "daily") -> StatisticsOut:
    try:
        return statistics(period)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/applications", response_model=list[AdminApplicationOut])
def applications(
    _: CurrentAdmin,
    user_id: Annotated[str | None, Query(alias="userId")] = None,
    profile_id: Annotated[str | None, Query(alias="profileId")] = None,
    company: str | None = None,
    role: str | None = None,
    status: str | None = None,
    cover_letter: Annotated[str | None, Query(alias="coverLetter")] = None,
    handler: str | None = None,
) -> list[AdminApplicationOut]:
    return list_applications(
        {
            "user_id": user_id,
            "profile_id": profile_id,
            "company": company,
            "role": role,
            "status": status,
            "cover_letter": cover_letter,
            "handler": handler,
        }
    )


@router.get("/ai/keys", response_model=list[AiKeyOut])
def keys(_: CurrentAdmin) -> list[AiKeyOut]:
    return list_keys()


@router.get("/ai/usage", response_model=list[AiUsageOut])
def usage(_: CurrentAdmin, key_id: Annotated[str | None, Query(alias="keyId")] = None) -> list[AiUsageOut]:
    return list_usage(key_id or "")


@router.post("/ai/keys", response_model=AiKeyOut)
def add_key(body: AiKeyIn, _: CurrentAdmin) -> AiKeyOut:
    try:
        return create_key(
            body.name,
            body.provider,
            body.secret,
            body.project_name,
            body.project_number,
            body.organization_id,
            body.project_id,
        )
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/ai/keys/{key_id}/test", response_model=AiTestOut)
def test(key_id: str, body: AiTestIn, admin: CurrentAdmin) -> AiTestOut:
    try:
        reply, model = test_key(key_id, str(admin.get("name") or ""), body.message)
    except StoreError as exc:
        raise raise_store_error(exc) from exc
    return AiTestOut(reply=reply, model=model)


@router.post("/ai/keys/{key_id}/revoke", response_model=AiKeyOut)
def revoke(key_id: str, _: CurrentAdmin) -> AiKeyOut:
    try:
        return revoke_key(key_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/ai/prompts", response_model=list[AiPromptOut])
def prompts(_: CurrentAdmin) -> list[AiPromptOut]:
    return list_prompts()


@router.put("/ai/prompts/{prompt_id}", response_model=AiPromptOut)
def save_prompt(prompt_id: str, body: PromptUpdate, _: CurrentAdmin) -> AiPromptOut:
    try:
        return update_prompt(prompt_id, body.body)
    except StoreError as exc:
        raise raise_store_error(exc) from exc
