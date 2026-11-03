from fastapi import APIRouter

from app.deps import CurrentUser, raise_store_error
from app.schemas import ProfileDetails, ProfileOut
from app.store import StoreError, store

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("", response_model=list[ProfileOut])
def list_profiles(user: CurrentUser) -> list[ProfileOut]:
    return store.list_profiles(user["id"])


@router.post("", response_model=ProfileOut)
def create_profile(body: ProfileDetails, user: CurrentUser) -> ProfileOut:
    try:
        return store.create_profile(user["id"], body)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.put("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: str, body: ProfileDetails, user: CurrentUser) -> ProfileOut:
    try:
        return store.update_profile(user["id"], profile_id, body)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: str, user: CurrentUser) -> ProfileOut:
    try:
        return store.get_profile(user["id"], profile_id)
    except StoreError as exc:
        raise raise_store_error(exc) from exc
