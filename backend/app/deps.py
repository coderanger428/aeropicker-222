from typing import Annotated

from fastapi import Depends, Header, HTTPException

from app.store import StoreError, store


def current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in required.")
    token = authorization.removeprefix("Bearer ").strip()
    user = store.user_for_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in required.")
    user["token"] = token
    return user


CurrentUser = Annotated[dict, Depends(current_user)]


def current_admin(user: CurrentUser) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin sign-in required.")
    return user


CurrentAdmin = Annotated[dict, Depends(current_admin)]


def raise_store_error(exc: StoreError) -> HTTPException:
    return HTTPException(status_code=exc.status, detail=str(exc))
