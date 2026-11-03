from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, applications, auth, profiles, resumes
from app.db import database

app = FastAPI(title="AeroPicker")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(resumes.router, prefix="/api")
app.include_router(applications.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, bool]:
    database().command("ping")
    return {"ok": True}
