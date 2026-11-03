from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
from threading import RLock
import uuid

from pydantic import ValidationError
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.db import database, document, record
from app.domain.ai_client import AiError, complete, complete_json
from app.domain.generate import build_cover_letter, build_export_files, build_resume, draft_answers, keywords_for
from app.domain.job_analyze import TAILOR_PROMPT, letter_from_text, tailor_message_parts, tailor_result
from app.domain.pdf_text import extract_pdf_text, resume_excerpt
from app.domain.resume_analyze import RESUME_PARSE_RULES, message_parts, profile_reference, resume_contact
from app.domain.roles import REQUIRED_ROLE_KEY, canonical_role
from app.domain.templates import TEMPLATES, document_files, render_pdf
from app.domain.text import validate_job_link
from app.schemas import (
    ApplicationDetailOut,
    ApplicationRecordOut,
    JobAnalysisOut,
    JobDraftOut,
    MasterResumeContent,
    ProfileDetails,
    ProfileOut,
    QaPairOut,
    ResumeOut,
    SessionOut,
    UserOut,
)

LANGUAGE_LEVELS = {"", "beginner", "intermediate", "advanced", "fluent", "natural"}


def _write_download(name: str, payload: dict) -> Path:
    folder = Path.home() / "Downloads"
    folder.mkdir(exist_ok=True)
    path = folder / name
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def _resume_document(content: dict) -> dict:
    skills: list[str] = []
    for group in content.get("skills") or []:
        if isinstance(group, dict):
            skills.extend(str(item).strip() for item in group.get("items") or [] if str(item).strip())
    return {
        "candidate_name": content.get("name") or "",
        "role_line": content.get("headline") or "",
        "summary": content.get("summary") or "",
        "skills": skills,
        "experience": [
            {
                "title": job.get("title") or "",
                "org": job.get("company") or "",
                "points": [str(point).strip() for point in job.get("highlights") or [] if str(point).strip()],
            }
            for job in content.get("experience") or []
            if isinstance(job, dict)
        ],
    }


def _apply_profile_contact(resume: dict, details: dict | None) -> None:
    """Replace the contact header with the profile. The master resume does not supply it."""
    reference = profile_reference(details)
    resume["name"] = reference["name"]
    resume["phone"] = reference["phone"]
    resume["email"] = reference["email"]
    resume["location"] = reference["location"]
    resume["links"] = reference["links"]


def _with_profile_contact(application: dict, details: dict | None) -> dict:
    view = dict(application)
    view["profile_contact"] = resume_contact(details)
    return view


def _write_tailor_pdfs(application: dict) -> list[Path]:
    folder = Path.home() / "Downloads"
    folder.mkdir(exist_ok=True)
    written = []
    for item in document_files(application):
        pdf = render_pdf(application.get("template_id") or "classic", item["kind"], application)
        path = folder / item["filename"]
        path.write_bytes(pdf)
        written.append(path)
    return written


def _default_prompts() -> list[dict]:
    return [
        {
            "id": "master-resume-parser",
            "position": 1,
            "name": "Master resume parser",
            "purpose": "Read an uploaded master resume and return resume JSON. Company names and work periods follow the profile.",
            "body": RESUME_PARSE_RULES,
            "updated_at": "2026-10-01T12:00:00.000Z",
        },
        {
            "id": "resume-tailor",
            "position": 2,
            "name": "Tailor prompt",
            "purpose": "Read the raw job description, tailor the master resume, and write the cover letter without inventing experience.",
            "body": TAILOR_PROMPT,
            "updated_at": "2026-10-01T12:00:00.000Z",
        },
        {
            "id": "qa-session",
            "position": 3,
            "name": "QA session",
            "purpose": "Draft an answer for each question on the application form.",
            "body": "Answer each application question in the first person. Use the tailored resume and the job description. Do not invent employers, dates, or tools. Keep each answer specific to that question.",
            "updated_at": "2026-10-01T12:00:00.000Z",
        },
    ]


def _google_demo_key() -> dict | None:
    path = Path(__file__).resolve().parents[3] / "frontend" / ".env.local"
    if not path.is_file():
        return None
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"')
    secret = values.get("VITE_GOOGLE_API_KEY", "")
    if not secret:
        return None
    return {
        "id": "key-google-resume",
        "name": values.get("VITE_GOOGLE_API_KEY_NAME") or "Resume Builder Dev Key",
        "provider": "Google",
        "secret": secret,
        "project_name": values.get("VITE_GOOGLE_PROJECT_NAME", ""),
        "project_number": values.get("VITE_GOOGLE_PROJECT_NUMBER", ""),
        "organization_id": "",
        "project_id": "",
        "created_at": "2026-10-31T01:00:00.000Z",
        "revoked_at": None,
        "tokens_in": 0,
        "tokens_out": 0,
    }


def _blank_details(full_name: str = "") -> dict:
    return {
        "full_name": full_name,
        "email": "",
        "linkedin": "",
        "address": "",
        "phone": "",
        "github": "",
        "portfolio": "",
        "x": "",
        "facebook": "",
        "include_linkedin": True,
        "include_address": True,
        "include_phone": True,
        "include_github": True,
        "include_portfolio": True,
        "include_x": True,
        "include_facebook": True,
        "experience": [],
        "education": [],
        "certificates": [],
        "languages": [],
    }


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _valid_email(email: str) -> bool:
    local, separator, domain = email.partition("@")
    return bool(separator and local and domain and "." in domain and not domain.startswith(".") and not domain.endswith("."))


def _clean_details(details: ProfileDetails) -> dict:
    data = details.model_dump()
    for key in ("full_name", "email", "linkedin", "address", "phone", "github", "portfolio", "x", "facebook"):
        data[key] = _text(data[key])
    if not data["full_name"]:
        raise StoreError("Enter the full name.")
    if len(data["full_name"]) > 80:
        raise StoreError("Full name must be 80 characters or fewer.")
    if data["email"] and not _valid_email(data["email"]):
        raise StoreError("Personal details: enter a valid email.")
    personal_started = any(data[key] for key in ("email", "linkedin", "address", "phone", "github", "portfolio", "x", "facebook"))
    if personal_started:
        if not data["email"]:
            raise StoreError("Personal details: enter an email.")
        if not data["linkedin"]:
            raise StoreError("Personal details: enter a LinkedIn URL.")
        if not data["address"]:
            raise StoreError("Personal details: enter an address.")
        if not data["phone"]:
            raise StoreError("Personal details: enter a phone number.")
    if any(len(data[key]) > 40 for key in ("experience", "education", "certificates", "languages")):
        raise StoreError("Too many entries in one section.")

    experience = []
    for item in data["experience"]:
        if len(item["projects"]) > 40:
            raise StoreError("Too many projects on one experience.")
        projects = []
        for project in item["projects"]:
            project["id"] = project["id"] or str(uuid.uuid4())
            project["title"] = _text(project["title"])
            project["description"] = _text(project["description"])
            if project["title"] or project["description"]:
                projects.append(project)
        item["id"] = item["id"] or str(uuid.uuid4())
        item["company"] = _text(item["company"])
        item["location"] = _text(item["location"])
        if item["current"]:
            item["end_date"] = ""
        item["projects"] = projects
        if not (item["company"] or item["location"] or item["start_date"] or item["end_date"] or item["current"] or projects):
            continue
        label = f"Experience {len(experience) + 1}"
        if not item["company"]:
            raise StoreError(f"{label}: enter the company name.")
        if not item["location"]:
            raise StoreError(f"{label}: enter the location.")
        if not item["start_date"]:
            raise StoreError(f"{label}: enter the start of the work period.")
        if not item["current"] and not item["end_date"]:
            raise StoreError(f"{label}: enter the end of the work period, or mark currently working.")
        for index, project in enumerate(projects, start=1):
            if not project["title"]:
                raise StoreError(f"{label}, project {index}: enter the title.")
            if not project["description"]:
                raise StoreError(f"{label}, project {index}: enter the description.")
        experience.append(item)
    data["experience"] = experience

    education = []
    for item in data["education"]:
        item["id"] = item["id"] or str(uuid.uuid4())
        item["school"] = _text(item["school"])
        item["location"] = _text(item["location"])
        item["degree"] = _text(item["degree"])
        if not (item["school"] or item["location"] or item["start_date"] or item["end_date"] or item["degree"]):
            continue
        label = f"Education {len(education) + 1}"
        if not item["school"]:
            raise StoreError(f"{label}: enter the school name.")
        if not item["location"]:
            raise StoreError(f"{label}: enter the location.")
        if not item["start_date"] or not item["end_date"]:
            raise StoreError(f"{label}: enter the study period.")
        if not item["degree"]:
            raise StoreError(f"{label}: enter the degree.")
        education.append(item)
    data["education"] = education

    certificates = []
    for item in data["certificates"]:
        item["id"] = item["id"] or str(uuid.uuid4())
        item["title"] = _text(item["title"])
        item["link"] = _text(item["link"])
        item["proof_file_name"] = _text(item["proof_file_name"])
        if not (item["title"] or item["link"] or item["proof_file_name"] or item["achieved_date"]):
            continue
        label = f"Certificate {len(certificates) + 1}"
        if not item["title"]:
            raise StoreError(f"{label}: enter the title.")
        if not item["link"]:
            raise StoreError(f"{label}: enter the link.")
        if not item["achieved_date"]:
            raise StoreError(f"{label}: enter the achieved date.")
        certificates.append(item)
    data["certificates"] = certificates

    languages = []
    for item in data["languages"]:
        item["id"] = item["id"] or str(uuid.uuid4())
        item["language"] = _text(item["language"])
        if item["level"] not in LANGUAGE_LEVELS:
            raise StoreError("Choose a language level from the list.")
        if not item["language"] and not item["level"]:
            continue
        label = f"Language {len(languages) + 1}"
        if not item["language"]:
            raise StoreError(f"{label}: enter the language.")
        if not item["level"]:
            raise StoreError(f"{label}: choose a level.")
        languages.append(item)
    data["languages"] = languages
    return data


MAX_RESUME_BYTES = 8 * 1024 * 1024


class StoreError(Exception):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class Store:
    def __init__(self) -> None:
        self._lock = RLock()
        self._db = database()
        self._ensure_prompts()
        if self._db.users.count_documents({}) == 0:
            self._bootstrap()
        self._import_uploaded_resume()

    def _replace(self, collection: str, item: dict, *, pdf: bool = False) -> None:
        self._db[collection].replace_one({"_id": item["id"]}, document(item, pdf=pdf), upsert=True)

    def _next_counter(self, name: str) -> int:
        updated = self._db.counters.find_one_and_update(
            {"_id": name},
            {"$inc": {"value": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if updated is None:
            raise StoreError("Database counters are missing.", 500)
        return int(updated["value"])

    def user_records(self) -> list[dict]:
        return [record(item) for item in self._db.users.find({})]

    def profile_records(self, user_id: str | None = None) -> list[dict]:
        query = {"user_id": user_id} if user_id else {}
        return [record(item) for item in self._db.profiles.find(query).sort("position", 1)]

    def application_records(self) -> list[dict]:
        return [record(item) for item in self._db.applications.find({}).sort("created_at", -1)]

    def ai_key_records(self) -> list[dict]:
        return [record(item) for item in self._db.ai_keys.find({}).sort("created_at", -1)]

    def ai_usage_records(self, key_id: str = "") -> list[dict]:
        query = {"key_id": key_id} if key_id else {}
        return [record(item) for item in self._db.ai_usage.find(query).sort("at", -1)]

    def prompt_records(self) -> list[dict]:
        return [record(item) for item in self._db.prompts.find({}).sort("position", 1)]

    def save_user(self, user: dict) -> None:
        try:
            self._replace("users", user)
        except DuplicateKeyError as exc:
            raise StoreError("An account with that email already exists.") from exc

    def save_ai_key(self, key: dict) -> None:
        self._replace("ai_keys", key)

    def save_prompt(self, prompt: dict) -> None:
        self._replace("prompts", prompt)

    def bind_token(self, token: str, user_id: str) -> None:
        self._db.sessions.replace_one({"_id": token}, {"_id": token, "user_id": user_id}, upsert=True)

    def _ensure_prompts(self) -> None:
        prompts = _default_prompts()
        self._db.prompts.delete_many({"_id": {"$nin": [prompt["id"] for prompt in prompts]}})
        for prompt in prompts:
            existing = self._db.prompts.find_one({"_id": prompt["id"]})
            if existing is None:
                self._db.prompts.insert_one(document(prompt))
                continue
            changed = (
                existing.get("position") != prompt["position"]
                or existing.get("name") != prompt["name"]
                or existing.get("purpose") != prompt["purpose"]
            )
            if not changed:
                continue
            existing["position"] = prompt["position"]
            existing["name"] = prompt["name"]
            existing["purpose"] = prompt["purpose"]
            self._db.prompts.replace_one({"_id": prompt["id"]}, existing)

    def _bootstrap(self) -> None:
        if self._db.counters.count_documents({}) == 0:
            self._db.counters.insert_many(
                [
                    {"_id": "seq", "value": 40},
                    {"_id": "app_seq", "value": 1041},
                ]
            )
        if self._db.users.count_documents({}) > 0:
            return
        self._db.users.insert_many(
            [
                document({"id": "usr-demo", "name": "Alex Rivera", "email": "demo@aeropicker.dev", "password": "demo", "role": "user", "deleted_at": None}),
                document({"id": "usr-admin", "name": "Admin", "email": "admin@aeropicker.dev", "password": "admin", "role": "admin", "deleted_at": None}),
            ]
        )
        google_key = _google_demo_key()
        if google_key:
            self._db.ai_keys.insert_one(document(google_key))
        self._db.profiles.insert_many(
            [
                document(
                    {
                        "id": "pro-platform",
                        "user_id": "usr-demo",
                        "name": "Platform",
                        "headline": "Product engineering seat",
                        "created_at": "2026-09-01T12:00:00.000Z",
                        "position": 1,
                        "details": _blank_details("Platform"),
                    }
                ),
                document(
                    {
                        "id": "pro-fresh",
                        "user_id": "usr-demo",
                        "name": "Fresh search",
                        "headline": "Exploring a new lane",
                        "created_at": "2026-10-20T12:00:00.000Z",
                        "position": 2,
                        "details": _blank_details("Fresh search"),
                    }
                ),
            ]
        )

    def _import_uploaded_resume(self) -> None:
        if self._db.resumes.find_one({"_id": "res-fullstack"}, {"_id": 1}):
            return
        if self._db.profiles.find_one({"_id": "pro-platform"}, {"_id": 1}) is None:
            return
        path = Path(__file__).resolve().parents[2] / "data" / "alex-fullstack.pdf"
        if not path.is_file():
            return
        payload = path.read_bytes()
        self._db.resumes.insert_one(
            document(
                {
                    "id": "res-fullstack",
                    "profile_id": "pro-platform",
                    "role_key": "full-stack",
                    "role_label": "Full Stack Engineer",
                    "file_name": "Efraim Joshua B. Malibong_Full Stack Developer_20261030.pdf",
                    "uploaded_at": "2026-11-02T04:30:00.000Z",
                    "text": "",
                    "content": None,
                    "pdf_bytes": payload,
                },
                pdf=True,
            )
        )

    def _closed_application(
        self,
        application_id: str,
        company: str,
        job_title: str,
        job_link: str,
        job_description: str,
        role_label: str,
        base_resume_id: str,
        generate_cover_letter: bool,
        status: str,
        created_at: str,
        updated_at: str,
        *,
        candidate_name: str = "Alex Rivera",
        profile_id: str = "pro-platform",
    ) -> dict:
        keywords = keywords_for(job_description)
        resume = build_resume(
            candidate_name=candidate_name,
            role_label=role_label,
            company=company,
            job_title=job_title,
            keywords=keywords,
        )
        cover_letter = (
            build_cover_letter(
                candidate_name=candidate_name,
                role_label=role_label,
                company=company,
                job_title=job_title,
                keywords=keywords,
            )
            if generate_cover_letter
            else None
        )
        created = {
            "id": application_id,
            "profile_id": profile_id,
            "company": company,
            "job_title": job_title,
            "job_link": job_link,
            "job_description": job_description,
            "generate_cover_letter": generate_cover_letter,
            "base_resume_id": base_resume_id,
            "resume_label": role_label,
            "candidate_name": candidate_name,
            "status": status,
            "open": False,
            "created_at": created_at,
            "updated_at": updated_at,
            "handler": candidate_name,
            "resume": resume,
            "cover_letter": cover_letter,
            "qa": [],
            "files": [],
        }
        if status in {"submitted", "exported"}:
            created["files"] = build_export_files(created)
        return created

    def _next_id(self, prefix: str) -> str:
        return f"{prefix}-{self._next_counter('seq')}"

    def _next_position(self) -> int:
        first = self._db.profiles.find_one(sort=[("position", 1)])
        if first is None:
            return 1
        return int(first.get("position", 1)) - 1

    def _user(self, user_id: str) -> dict:
        found = record(self._db.users.find_one({"_id": user_id}))
        if found is None:
            raise StoreError("Sign in required.", 401)
        return found

    def _profile(self, user_id: str, profile_id: str) -> dict:
        found = record(self._db.profiles.find_one({"_id": profile_id, "user_id": user_id}))
        if found is None:
            raise StoreError("That profile is not on this account.", 404)
        return found

    def _application(self, user_id: str, application_id: str) -> dict:
        found = record(self._db.applications.find_one({"_id": application_id}))
        if found is None:
            raise StoreError("That application could not be found.", 404)
        self._profile(user_id, found["profile_id"])
        return found

    def _resumes_for(self, profile_id: str) -> list[dict]:
        return [record(item) for item in self._db.resumes.find({"profile_id": profile_id}, {"pdf": 0})]

    def _save_application(self, application: dict) -> None:
        self._replace("applications", application)

    def _profile_out(self, profile: dict) -> ProfileOut:
        resumes = self._resumes_for(profile["id"])
        raw = profile.get("details") or _blank_details(profile["name"])
        if not str(raw.get("full_name", "")).strip():
            raw = {**_blank_details(profile["name"]), **raw, "full_name": profile["name"]}
        return ProfileOut(
            id=profile["id"],
            name=profile["name"],
            headline=profile["headline"],
            created_at=profile["created_at"],
            resume_count=len(resumes),
            application_count=self._db.applications.count_documents({"profile_id": profile["id"]}),
            has_required_resume=any(resume["role_key"] == REQUIRED_ROLE_KEY for resume in resumes),
            details=ProfileDetails.model_validate(raw),
        )

    def _detail(self, application: dict, profile_name: str) -> ApplicationDetailOut:
        payload = deepcopy(application)
        payload["profile_name"] = profile_name
        payload["template_id"] = application.get("template_id") or "classic"
        payload["files"] = document_files(application)
        return ApplicationDetailOut.model_validate(payload)

    def user_for_token(self, token: str) -> dict | None:
        with self._lock:
            session = self._db.sessions.find_one({"_id": token})
            if session is None:
                return None
            return record(self._db.users.find_one({"_id": session["user_id"]}))

    def login(self, email: str, password: str) -> SessionOut:
        with self._lock:
            normalized = email.strip().lower()
            user = record(self._db.users.find_one({"email": normalized}))
            if user is None or user["password"] != password or user.get("role") == "admin":
                raise StoreError("Email or password is incorrect.")
            if user.get("deleted_at"):
                raise StoreError("This account is marked deleted.")
            token = f"ap_{user['id']}"
            self.bind_token(token, user["id"])
            return SessionOut(token=token, user=UserOut(id=user["id"], name=user["name"], email=user["email"]))

    def signup(self, name: str, email: str, password: str) -> SessionOut:
        with self._lock:
            cleaned_name = name.strip()
            normalized = email.strip().lower()
            if not cleaned_name:
                raise StoreError("Enter your name.")
            if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
                raise StoreError("Enter a valid email.")
            if len(password) < 4:
                raise StoreError("Use at least 4 characters for the password.")
            if self._db.users.find_one({"email": normalized}, {"_id": 1}):
                raise StoreError("An account with that email already exists.")
            user = {
                "id": self._next_id("usr"),
                "name": cleaned_name,
                "email": normalized,
                "password": password,
                "role": "user",
                "deleted_at": None,
            }
            self.save_user(user)
            token = f"ap_{user['id']}"
            self.bind_token(token, user["id"])
            return SessionOut(token=token, user=UserOut(id=user["id"], name=user["name"], email=user["email"]))

    def logout(self, token: str) -> None:
        with self._lock:
            self._db.sessions.delete_one({"_id": token})

    def list_profiles(self, user_id: str) -> list[ProfileOut]:
        with self._lock:
            return [self._profile_out(profile) for profile in self.profile_records(user_id)]

    def create_profile(self, user_id: str, details: ProfileDetails) -> ProfileOut:
        with self._lock:
            cleaned = _clean_details(details)
            profile = {
                "id": self._next_id("pro"),
                "user_id": user_id,
                "name": cleaned["full_name"],
                "headline": "",
                "created_at": _now(),
                "position": self._next_position(),
                "details": cleaned,
            }
            self._replace("profiles", profile)
            return self._profile_out(profile)

    def update_profile(self, user_id: str, profile_id: str, details: ProfileDetails) -> ProfileOut:
        with self._lock:
            profile = self._profile(user_id, profile_id)
            cleaned = _clean_details(details)
            profile["name"] = cleaned["full_name"]
            profile["details"] = cleaned
            self._replace("profiles", profile)
            return self._profile_out(profile)

    def get_profile(self, user_id: str, profile_id: str) -> ProfileOut:
        with self._lock:
            return self._profile_out(self._profile(user_id, profile_id))

    def _resume_out(self, resume: dict) -> ResumeOut:
        text = resume.get("text") or ""
        content = resume.get("content") or None
        return ResumeOut(
            id=resume["id"],
            profile_id=resume["profile_id"],
            role_key=resume["role_key"],
            role_label=resume["role_label"],
            file_name=resume["file_name"],
            uploaded_at=resume["uploaded_at"],
            character_count=len(text),
            excerpt=resume_excerpt(text),
            applied_count=self._db.applications.count_documents({"base_resume_id": resume["id"]}),
            content=MasterResumeContent.model_validate(content) if content else None,
        )

    def resume_pdf(self, user_id: str, profile_id: str, resume_id: str) -> tuple[str, bytes]:
        with self._lock:
            self._profile(user_id, profile_id)
            resume = record(self._db.resumes.find_one({"_id": resume_id, "profile_id": profile_id}), pdf=True)
            if resume is None or not resume.get("pdf_bytes"):
                raise StoreError("That PDF is no longer stored.", 404)
            return resume["file_name"], resume["pdf_bytes"]

    def list_resumes(self, user_id: str, profile_id: str) -> list[ResumeOut]:
        with self._lock:
            self._profile(user_id, profile_id)
            return [self._resume_out(resume) for resume in self._resumes_for(profile_id)]

    def upload_resume(
        self,
        user_id: str,
        profile_id: str,
        role_key: str,
        role_label: str,
        file_name: str,
        content_type: str,
        payload: bytes,
    ) -> ResumeOut:
        with self._lock:
            self._profile(user_id, profile_id)
            if not file_name.lower().endswith(".pdf"):
                raise StoreError("Only PDF files are supported. DOCX is planned for a later version.")
            if content_type and content_type not in {"application/pdf", "application/x-pdf"}:
                raise StoreError("Only PDF files are supported. DOCX is planned for a later version.")
            if len(payload) <= 0:
                raise StoreError("That PDF is empty.")
            if len(payload) > MAX_RESUME_BYTES:
                raise StoreError("PDFs must be 8 MB or smaller.")
            if not payload.startswith(b"%PDF-"):
                raise StoreError("That file is not a PDF.")
            try:
                canonical_key, canonical_label = canonical_role(role_key, role_label)
            except ValueError as exc:
                raise StoreError(str(exc)) from exc
            now = _now()
            existing = record(self._db.resumes.find_one({"profile_id": profile_id, "role_key": canonical_key}, {"pdf": 0}))
            if existing is not None:
                existing["role_label"] = canonical_label
                existing["file_name"] = file_name
                existing["uploaded_at"] = now
                existing["text"] = ""
                existing["content"] = None
                existing["pdf_bytes"] = payload
                self._replace("resumes", existing, pdf=True)
                return self._resume_out(existing)
            created = {
                "id": self._next_id("res"),
                "profile_id": profile_id,
                "role_key": canonical_key,
                "role_label": canonical_label,
                "file_name": file_name,
                "uploaded_at": now,
                "text": "",
                "content": None,
                "pdf_bytes": payload,
            }
            self._replace("resumes", created, pdf=True)
            return self._resume_out(created)

    def remove_resume(self, user_id: str, profile_id: str, resume_id: str) -> None:
        with self._lock:
            self._profile(user_id, profile_id)
            deleted = self._db.resumes.delete_one({"_id": resume_id, "profile_id": profile_id})
            if deleted.deleted_count == 0:
                raise StoreError("That resume is no longer on this profile.", 404)

    def _active_key(self) -> dict:
        keys = [key for key in self.ai_key_records() if not key.get("revoked_at")]
        if not keys:
            raise StoreError("Add an API key before using the model.")
        keys.sort(key=lambda key: key.get("created_at") or "", reverse=True)
        return keys[0]

    def _prompt_body(self, prompt_id: str) -> str:
        prompt = next((item for item in self.prompt_records() if item["id"] == prompt_id), None)
        body = str((prompt or {}).get("body") or "").strip()
        if not body:
            raise StoreError("Save the prompt before running this step.")
        return body

    def _complete(self, prompt_id: str, content: str, shape: str, purpose: str) -> dict:
        with self._lock:
            key = dict(self._active_key())
            instructions = self._prompt_body(prompt_id)
        try:
            parsed, usage = complete(key, instructions, f"{content}\n\nJSON shape:\n{shape}")
        except AiError as exc:
            raise StoreError(str(exc), exc.status if exc.status < 500 else 502) from exc
        self._record_usage(key["id"], usage, purpose)
        return parsed

    def _record_usage(self, key_id: str, usage: dict, purpose: str) -> None:
        with self._lock:
            key = next((item for item in self.ai_key_records() if item["id"] == key_id), None)
            prompt_tokens = int(usage.get("prompt_tokens") or 0)
            output_tokens = int(usage.get("output_tokens") or 0)
            thought_tokens = int(usage.get("thought_tokens") or 0)
            if key is not None:
                key["tokens_in"] = int(key.get("tokens_in") or 0) + prompt_tokens
                key["tokens_out"] = int(key.get("tokens_out") or 0) + output_tokens + thought_tokens
                self.save_ai_key(key)
            self._db.ai_usage.insert_one(
                document(
                    {
                        "id": f"use-{uuid.uuid4().hex[:8]}",
                        "key_id": key_id,
                        "at": _now(),
                        "model": usage.get("model") or "",
                        "purpose": purpose,
                        "prompt_tokens": prompt_tokens,
                        "output_tokens": output_tokens,
                        "thought_tokens": thought_tokens,
                        "total_tokens": prompt_tokens + output_tokens + thought_tokens,
                    }
                )
            )

    def analyze_resume(self, user_id: str, profile_id: str, resume_id: str) -> ResumeOut:
        with self._lock:
            profile = self._profile(user_id, profile_id)
            resume = record(self._db.resumes.find_one({"_id": resume_id, "profile_id": profile_id}), pdf=True)
            if resume is None or not resume.get("pdf_bytes"):
                raise StoreError("That PDF is no longer stored.", 404)
            try:
                text = extract_pdf_text(resume["pdf_bytes"])
            except ValueError as exc:
                raise StoreError(str(exc)) from exc
            if not text.strip():
                raise StoreError("That PDF has no text to read.")
            reference = profile_reference(profile.get("details"))
            key = dict(self._active_key())
            instructions = self._prompt_body("master-resume-parser")
        try:
            parsed, usage = complete_json(key, instructions, message_parts(text, reference))
        except AiError as exc:
            raise StoreError(str(exc), exc.status if exc.status < 500 else 502) from exc
        self._record_usage(key["id"], usage, "Master resume parser")
        try:
            content = MasterResumeContent.model_validate(parsed).model_dump(by_alias=True)
        except ValidationError as exc:
            raise StoreError("The analyzer returned resume JSON that does not match the resume fields.") from exc
        with self._lock:
            resume = record(self._db.resumes.find_one({"_id": resume_id, "profile_id": profile_id}), pdf=True)
            if resume is None:
                raise StoreError("That PDF is no longer stored.", 404)
            resume["text"] = text
            resume["content"] = content
            self._replace("resumes", resume, pdf=True)
            return self._resume_out(resume)

    def get_draft(self, user_id: str, profile_id: str) -> JobDraftOut | None:
        with self._lock:
            self._profile(user_id, profile_id)
            application = record(self._db.applications.find_one({"profile_id": profile_id, "open": True}))
            if application is None:
                return None
            return JobDraftOut(
                application_id=application["id"],
                status="exported" if application["status"] == "exported" else "tailored",
                company=application["company"],
                job_title=application["job_title"],
                job_link=application["job_link"],
                job_description=application["job_description"],
                generate_cover_letter=application["generate_cover_letter"],
                base_resume_id=application["base_resume_id"],
            )

    def tailor(self, user_id: str, profile_id: str, body: dict) -> JobAnalysisOut:
        with self._lock:
            user = self._user(user_id)
            self._profile(user_id, profile_id)
            resumes = self._resumes_for(profile_id)
            if not any(resume["role_key"] == REQUIRED_ROLE_KEY for resume in resumes):
                raise StoreError("Upload a Full Stack Engineer resume before tailoring.")
            base = next((resume for resume in resumes if resume["id"] == body["base_resume_id"]), None)
            if base is None:
                raise StoreError("Choose a master resume from this profile.")
            if not base.get("content"):
                raise StoreError("Analyze that master resume before tailoring.")
            company = body["company"].strip()
            job_title = body["job_title"].strip()
            job_description = body["job_description"].strip()
            job_link = body.get("job_link", "").strip()
            if not company:
                raise StoreError("Enter the company.")
            if not job_title:
                raise StoreError("Enter the job title.")
            if not job_description:
                raise StoreError("Paste the job description.")
            link_error = validate_job_link(job_link)
            if link_error:
                raise StoreError(link_error)
            master = MasterResumeContent.model_validate(base["content"]).model_dump(by_alias=True)
            role_label = base["role_label"]
            candidate_name = user["name"]
            base_id = base["id"]
            key = dict(self._active_key())
            tailor_instructions = self._prompt_body("resume-tailor")
        try:
            tailored, tailor_usage = complete_json(
                key, tailor_instructions, tailor_message_parts(master, job_description, company)
            )
        except AiError as exc:
            raise StoreError(str(exc), exc.status if exc.status < 500 else 502) from exc
        self._record_usage(key["id"], tailor_usage, "Tailor prompt")
        try:
            result = tailor_result(tailored)
        except ValueError as exc:
            path = _write_download("tailor-result.txt", tailored if isinstance(tailored, dict) else {"model": tailored})
            raise StoreError(f"The tailor returned JSON that does not match the resume and cover letter ({exc}). Wrote it to {path}.") from exc
        with self._lock:
            profile = self._profile(user_id, profile_id)
            _apply_profile_contact(result["resume"], profile.get("details"))
            letter = letter_from_text(result["cover_letter"], result["resume"].get("name") or "")
            _write_download("tailor-result.txt", {"resume": result["resume"], "cover_letter": result["cover_letter"]})
            now = _now()
            application_body = {
                "company": company,
                "job_title": job_title,
                "job_link": job_link,
                "job_description": job_description,
                "generate_cover_letter": True,
                "base_resume_id": base_id,
                "resume_label": role_label,
                "candidate_name": candidate_name,
                "tailor_input": {"master_resume": master, "tailored_resume": result["resume"], "job": {}},
                "status": "tailored",
                "updated_at": now,
                "resume": _resume_document(result["resume"]),
                "cover_letter": letter,
                "qa": [],
                "files": [],
                "template_id": "classic",
            }
            existing = record(self._db.applications.find_one({"profile_id": profile_id, "open": True}))
            if existing is not None:
                existing.update(application_body)
                saved = existing
            else:
                saved = {
                    "id": f"AP-{self._next_counter('app_seq')}",
                    "profile_id": profile_id,
                    "open": True,
                    "created_at": now,
                    "handler": candidate_name,
                    **application_body,
                }
            try:
                if existing is None:
                    self._db.applications.insert_one(document(saved))
                else:
                    self._save_application(saved)
            except DuplicateKeyError:
                existing = record(self._db.applications.find_one({"profile_id": profile_id, "open": True}))
                if existing is None:
                    raise
                existing.update(application_body)
                self._save_application(existing)
                saved = existing
            self._detail(saved, profile["name"])
            paths = _write_tailor_pdfs(_with_profile_contact(saved, profile.get("details")))
        return JobAnalysisOut(file=str(paths[0]), application_id=saved["id"])

    def get_application(self, user_id: str, application_id: str) -> ApplicationDetailOut:
        with self._lock:
            application = self._application(user_id, application_id)
            profile = self._profile(user_id, application["profile_id"])
            return self._detail(application, profile["name"])

    def list_templates(self) -> list[dict]:
        return [dict(item) for item in TEMPLATES.values()]

    def set_template(self, user_id: str, application_id: str, template_id: str) -> ApplicationDetailOut:
        with self._lock:
            if template_id not in TEMPLATES:
                raise StoreError("Choose a template from the list.")
            application = self._application(user_id, application_id)
            if not application["open"]:
                raise StoreError("This application is already closed.", 409)
            application["template_id"] = template_id
            application["updated_at"] = _now()
            self._save_application(application)
            profile = self._profile(user_id, application["profile_id"])
            return self._detail(application, profile["name"])

    def render_document(self, user_id: str, application_id: str, kind: str) -> tuple[bytes, str]:
        with self._lock:
            if kind not in {"resume", "cover-letter"}:
                raise StoreError("That document is not on this application.", 404)
            application = self._application(user_id, application_id)
            if kind == "cover-letter" and not application.get("cover_letter"):
                raise StoreError("This application has no cover letter.", 404)
            profile = self._profile(user_id, application["profile_id"])
            view = _with_profile_contact(application, profile.get("details"))
            pdf = render_pdf(application.get("template_id") or "classic", kind, view)
            filename = next(item["filename"] for item in document_files(view) if item["kind"] == kind)
            if application["open"] and application["status"] == "tailored":
                application["status"] = "exported"
                application["updated_at"] = _now()
                self._save_application(application)
            return pdf, filename

    def export_application(self, user_id: str, application_id: str) -> ApplicationDetailOut:
        with self._lock:
            application = self._application(user_id, application_id)
            if not application["open"]:
                raise StoreError("This application is already closed.", 409)
            application["files"] = build_export_files(application)
            application["status"] = "exported"
            application["updated_at"] = _now()
            self._save_application(application)
            profile = self._profile(user_id, application["profile_id"])
            return self._detail(application, profile["name"])

    def ask_qa(self, user_id: str, application_id: str, questions: list[str]) -> list[QaPairOut]:
        with self._lock:
            application = self._application(user_id, application_id)
            if not application["open"]:
                raise StoreError("This application is already closed.", 409)
            cleaned = [question.strip() for question in questions if question.strip()]
            if not cleaned:
                raise StoreError("Paste at least one question.")
            pairs = draft_answers(
                cleaned,
                candidate_name=application["candidate_name"],
                company=application["company"],
                job_title=application["job_title"],
                keywords=keywords_for(f"{application['job_description']}\n" + "\n".join(cleaned)),
            )
            application["qa"] = pairs
            application["updated_at"] = _now()
            self._save_application(application)
            return [QaPairOut.model_validate(pair) for pair in pairs]

    def save_qa(self, user_id: str, application_id: str, pairs: list[dict]) -> list[QaPairOut]:
        with self._lock:
            application = self._application(user_id, application_id)
            if not application["open"]:
                raise StoreError("This application is already closed.", 409)
            cleaned = []
            for index, pair in enumerate(pairs):
                question = str(pair.get("question", "")).strip()
                if not question:
                    continue
                cleaned.append({"id": pair.get("id") or f"qa-{index + 1}", "question": question, "answer": pair.get("answer", "")})
            application["qa"] = cleaned
            application["updated_at"] = _now()
            self._save_application(application)
            return [QaPairOut.model_validate(pair) for pair in cleaned]

    def finish(self, user_id: str, application_id: str) -> None:
        self._close(user_id, application_id, "submitted")

    def quit(self, user_id: str, application_id: str) -> None:
        self._close(user_id, application_id, "quit")

    def _close(self, user_id: str, application_id: str, status: str) -> None:
        with self._lock:
            application = self._application(user_id, application_id)
            if not application["open"]:
                raise StoreError("This application is already closed.", 409)
            if status == "submitted" and application["status"] != "exported":
                raise StoreError("Download the resume before finishing.", 409)
            application["status"] = status
            application["open"] = False
            application["updated_at"] = _now()
            self._save_application(application)

    def list_applications(self, user_id: str, filters: dict) -> list[ApplicationRecordOut]:
        with self._lock:
            names = {profile["id"]: profile["name"] for profile in self.profile_records(user_id)}
            rows = []
            found = self._db.applications.find({"profile_id": {"$in": list(names)}}).sort("created_at", -1)
            for item in found:
                application = record(item)
                if application is None or application["profile_id"] not in names:
                    continue
                if not self._matches(application, filters):
                    continue
                rows.append(
                    ApplicationRecordOut(
                        id=application["id"],
                        date=application["created_at"],
                        profile_id=application["profile_id"],
                        profile_name=names[application["profile_id"]],
                        company=application["company"],
                        role=application["job_title"],
                        job_link=application["job_link"],
                        resume=application["resume_label"],
                        has_cover_letter=application["generate_cover_letter"],
                        status=application["status"],
                        last_update=application["updated_at"],
                        handler=application["handler"],
                    )
                )
            rows.sort(key=lambda row: row.date, reverse=True)
            return rows

    def _matches(self, application: dict, filters: dict) -> bool:
        profile_id = filters.get("profile_id") or ""
        company = (filters.get("company") or "").strip().lower()
        role = (filters.get("role") or "").strip().lower()
        status = filters.get("status") or ""
        cover_letter = filters.get("cover_letter") or ""
        handler = (filters.get("handler") or "").strip().lower()
        if profile_id and application["profile_id"] != profile_id:
            return False
        if company and company not in application["company"].lower():
            return False
        if role and role not in application["job_title"].lower():
            return False
        if status and application["status"] != status:
            return False
        if cover_letter == "yes" and not application["generate_cover_letter"]:
            return False
        if cover_letter == "no" and application["generate_cover_letter"]:
            return False
        if handler and handler not in application["handler"].lower():
            return False
        return True


store = Store()
