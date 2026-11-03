from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response

from app.deps import CurrentUser, raise_store_error
from app.schemas import ResumeOut
from app.store import StoreError, store

router = APIRouter(prefix="/profiles/{profile_id}/resumes", tags=["resumes"])


@router.get("", response_model=list[ResumeOut])
def list_resumes(profile_id: str, user: CurrentUser) -> list[ResumeOut]:
    try:
        return store.list_resumes(user["id"], profile_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("", response_model=ResumeOut)
async def upload_resume(
    profile_id: str,
    user: CurrentUser,
    role_key: Annotated[str, Form(alias="roleKey")],
    role_label: Annotated[str, Form(alias="roleLabel")],
    file: UploadFile = File(...),
) -> ResumeOut:
    payload = await file.read()
    try:
        return store.upload_resume(
            user["id"],
            profile_id,
            role_key,
            role_label,
            file.filename or "",
            file.content_type or "",
            payload,
        )
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/{resume_id}/analyze", response_model=ResumeOut)
def analyze_resume(profile_id: str, resume_id: str, user: CurrentUser) -> ResumeOut:
    try:
        return store.analyze_resume(user["id"], profile_id, resume_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/{resume_id}/file")
def download_resume(profile_id: str, resume_id: str, user: CurrentUser) -> Response:
    try:
        file_name, payload = store.resume_pdf(user["id"], profile_id, resume_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc
    return Response(
        content=payload,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


@router.delete("/{resume_id}", status_code=204)
def remove_resume(profile_id: str, resume_id: str, user: CurrentUser) -> None:
    try:
        store.remove_resume(user["id"], profile_id, resume_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc
