from fastapi import APIRouter, Header

from app.deps import CurrentUser, raise_store_error
from app.schemas import LoginIn, SessionOut, SignupIn, UserOut
from app.store import StoreError, store

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionOut)
def login(body: LoginIn) -> SessionOut:
    try:
        return store.login(body.email, body.password)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/signup", response_model=SessionOut)
def signup(body: SignupIn) -> SessionOut:
    try:
        return store.signup(body.name, body.email, body.password)
    except StoreError as exc:
        raise raise_store_error(exc) from exc


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(default=None)) -> None:
    if authorization and authorization.startswith("Bearer "):
        store.logout(authorization.removeprefix("Bearer ").strip())


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut(id=user["id"], name=user["name"], email=user["email"])
