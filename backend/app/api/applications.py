from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.deps import CurrentUser, raise_store_error
from app.schemas import (
    ApplicationDetailOut,
    ApplicationRecordOut,
    AskQaIn,
    DocumentTemplateOut,
    JobAnalysisOut,
    JobDraftOut,
    QaPairOut,
    SaveQaIn,
    TailorIn,
    TemplateChoiceIn,
)
from app.store import StoreError, store

router = APIRouter(tags=["applications"])


@router.get("/profiles/{profile_id}/draft", response_model=JobDraftOut | None)
def get_draft(profile_id: str, user: CurrentUser) -> JobDraftOut | None:
    try:
        return store.get_draft(user["id"], profile_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/profiles/{profile_id}/tailor", response_model=JobAnalysisOut)
def tailor(profile_id: str, body: TailorIn, user: CurrentUser) -> JobAnalysisOut:
    try:
        return store.tailor(user["id"], profile_id, body.model_dump())
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/applications/{application_id}", response_model=ApplicationDetailOut)
def get_application(application_id: str, user: CurrentUser) -> ApplicationDetailOut:
    try:
        return store.get_application(user["id"], application_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/templates", response_model=list[DocumentTemplateOut])
def list_document_templates() -> list[DocumentTemplateOut]:
    return [DocumentTemplateOut.model_validate(item) for item in store.list_templates()]


@router.put("/applications/{application_id}/template", response_model=ApplicationDetailOut)
def set_template(application_id: str, body: TemplateChoiceIn, user: CurrentUser) -> ApplicationDetailOut:
    try:
        return store.set_template(user["id"], application_id, body.template_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/applications/{application_id}/documents/{kind}")
def download_document(application_id: str, kind: str, user: CurrentUser) -> Response:
    try:
        pdf, filename = store.render_document(user["id"], application_id, kind)
    except StoreError as exc:
        raise raise_store_error(exc) from exc
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/applications/{application_id}/export", response_model=ApplicationDetailOut)
def export_application(application_id: str, user: CurrentUser) -> ApplicationDetailOut:
    try:
        return store.export_application(user["id"], application_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/applications/{application_id}/qa", response_model=list[QaPairOut])
def ask_qa(application_id: str, body: AskQaIn, user: CurrentUser) -> list[QaPairOut]:
    try:
        return store.ask_qa(user["id"], application_id, body.questions)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.put("/applications/{application_id}/qa", response_model=list[QaPairOut])
def save_qa(application_id: str, body: SaveQaIn, user: CurrentUser) -> list[QaPairOut]:
    try:
        return store.save_qa(user["id"], application_id, [pair.model_dump() for pair in body.pairs])
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/applications/{application_id}/finish", status_code=204)
def finish_application(application_id: str, user: CurrentUser) -> None:
    try:
        store.finish(user["id"], application_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/applications/{application_id}/quit", status_code=204)
def quit_application(application_id: str, user: CurrentUser) -> None:
    try:
        store.quit(user["id"], application_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/applications", response_model=list[ApplicationRecordOut])
def list_applications(
    user: CurrentUser,
    profile_id: Annotated[str | None, Query(alias="profileId")] = None,
    company: str | None = None,
    role: str | None = None,
    status: str | None = None,
    cover_letter: Annotated[str | None, Query(alias="coverLetter")] = None,
    handler: str | None = None,
) -> list[ApplicationRecordOut]:
    return store.list_applications(
        user["id"],
        {
            "profile_id": profile_id,
            "company": company,
            "role": role,
            "status": status,
            "cover_letter": cover_letter,
            "handler": handler,
        },
    )
