from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class UserOut(ApiModel):
    id: str
    name: str
    email: str


class SessionOut(ApiModel):
    token: str
    user: UserOut


class ProfileProject(ApiModel):
    id: str = ""
    title: str = ""
    description: str = ""


class ProfileExperience(ApiModel):
    id: str = ""
    company: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    current: bool = False
    projects: list[ProfileProject] = []


class ProfileEducation(ApiModel):
    id: str = ""
    school: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    degree: str = ""


class ProfileCertificate(ApiModel):
    id: str = ""
    title: str = ""
    link: str = ""
    proof_file_name: str = ""
    achieved_date: str = ""


class ProfileLanguage(ApiModel):
    id: str = ""
    language: str = ""
    level: str = ""


class ProfileDetails(ApiModel):
    full_name: str = ""
    email: str = ""
    linkedin: str = ""
    address: str = ""
    phone: str = ""
    github: str = ""
    portfolio: str = ""
    x: str = ""
    facebook: str = ""
    include_linkedin: bool = True
    include_address: bool = True
    include_phone: bool = True
    include_github: bool = True
    include_portfolio: bool = True
    include_x: bool = True
    include_facebook: bool = True
    experience: list[ProfileExperience] = []
    education: list[ProfileEducation] = []
    certificates: list[ProfileCertificate] = []
    languages: list[ProfileLanguage] = []


class ProfileOut(ApiModel):
    id: str
    name: str
    headline: str
    created_at: str
    resume_count: int
    application_count: int
    has_required_resume: bool
    details: ProfileDetails


class ResumeLinkOut(ApiModel):
    label: str
    url: str = ""


class ResumeSkillGroupOut(ApiModel):
    group: str
    items: list[str]


class ResumeJobOut(ApiModel):
    company: str
    title: str
    location: str = ""
    start: str
    end: str = ""
    current: bool = False
    highlights: list[str]


class ResumeSchoolOut(ApiModel):
    school: str
    degree: str
    start: str
    end: str


class MasterResumeContent(ApiModel):
    name: str = ""
    headline: str = ""
    location: str = ""
    phone: str = ""
    email: str = ""
    availability: str = ""
    links: list[ResumeLinkOut] = []
    summary: str = ""
    skills: list[ResumeSkillGroupOut] = []
    experience: list[ResumeJobOut] = []
    education: list[ResumeSchoolOut] = []


class ResumeOut(ApiModel):
    id: str
    profile_id: str
    role_key: str
    role_label: str
    file_name: str
    uploaded_at: str
    character_count: int = 0
    excerpt: str = ""
    applied_count: int = 0
    content: MasterResumeContent | None = None


class ExperienceOut(ApiModel):
    title: str
    org: str
    points: list[str]


class ResumeDocumentOut(ApiModel):
    candidate_name: str
    role_line: str
    summary: str
    skills: list[str]
    experience: list[ExperienceOut]


class CoverLetterBulletOut(ApiModel):
    label: str = ""
    text: str = ""


class CoverLetterOut(ApiModel):
    subject: str
    salutation: str
    paragraphs: list[str]
    bullets: list[CoverLetterBulletOut] = []
    closing: str
    signature: str


class QaPairOut(ApiModel):
    id: str
    question: str
    answer: str


class ExportedFileOut(ApiModel):
    kind: str = "resume"
    filename: str
    title: str
    lines: list[str] = []


class DocumentTemplateOut(ApiModel):
    id: str
    label: str


class TemplateChoiceIn(ApiModel):
    template_id: str


class JobDraftOut(ApiModel):
    application_id: str
    status: str
    company: str
    job_title: str
    job_link: str
    job_description: str
    generate_cover_letter: bool
    base_resume_id: str


class TailorIn(ApiModel):
    company: str
    job_title: str
    job_link: str = ""
    job_description: str
    generate_cover_letter: bool = True
    base_resume_id: str


class AskQaIn(ApiModel):
    questions: list[str]


class SaveQaIn(ApiModel):
    pairs: list[QaPairOut]


class ParsedJobOut(ApiModel):
    key_skills: list[str] = []
    pref_skills: list[str] = []
    reuse_phrases: list[str] = []


class JobAnalysisOut(ApiModel):
    file: str
    application_id: str


class TailorPacketOut(ApiModel):
    master_resume: MasterResumeContent
    job: ParsedJobOut
    tailored_resume: MasterResumeContent | None = None


class ApplicationDetailOut(ApiModel):
    id: str
    profile_id: str
    profile_name: str
    company: str
    job_title: str
    job_link: str
    job_description: str
    generate_cover_letter: bool
    base_resume_id: str
    resume_label: str
    candidate_name: str
    status: str
    open: bool
    created_at: str
    updated_at: str
    handler: str
    template_id: str = "classic"
    tailor_input: TailorPacketOut | None = None
    resume: ResumeDocumentOut
    cover_letter: CoverLetterOut | None
    qa: list[QaPairOut]
    files: list[ExportedFileOut]


class ApplicationRecordOut(ApiModel):
    id: str
    date: str
    profile_id: str
    profile_name: str
    company: str
    role: str
    job_link: str
    resume: str
    has_cover_letter: bool
    status: str
    last_update: str
    handler: str


class LoginIn(ApiModel):
    email: str
    password: str


class SignupIn(ApiModel):
    name: str
    email: str
    password: str


class AdminUserOut(ApiModel):
    id: str
    name: str
    email: str
    profile_count: int
    application_count: int
    deleted_at: str | None = None


class AdminUserUpdate(ApiModel):
    name: str
    email: str


class DeletedIn(ApiModel):
    deleted: bool


class AdminProfileOut(ApiModel):
    id: str
    name: str


class AdminApplicationOut(ApplicationRecordOut):
    user_id: str
    user_name: str


class StatisticsColumn(ApiModel):
    key: str
    label: str


class StatisticsRow(ApiModel):
    user_id: str
    user_name: str
    deleted: bool
    counts: list[int]
    total: int


class StatisticsOut(ApiModel):
    period: str
    columns: list[StatisticsColumn]
    rows: list[StatisticsRow]


class SearchOut(ApiModel):
    users: list[AdminUserOut]
    applications: list[AdminApplicationOut]


class AiKeyOut(ApiModel):
    id: str
    name: str
    provider: str
    last_four: str
    project_name: str = ""
    project_number: str = ""
    organization_id: str = ""
    project_id: str = ""
    created_at: str
    revoked_at: str | None = None
    tokens_in: int
    tokens_out: int


class AiUsageOut(ApiModel):
    id: str
    key_id: str
    at: str
    model: str
    purpose: str
    prompt_tokens: int
    output_tokens: int
    thought_tokens: int
    total_tokens: int


class AiTestIn(ApiModel):
    message: str


class AiTestOut(ApiModel):
    reply: str
    model: str


class AiKeyIn(ApiModel):
    name: str
    provider: str
    secret: str
    project_name: str = ""
    project_number: str = ""
    organization_id: str = ""
    project_id: str = ""


class AiPromptOut(ApiModel):
    id: str
    name: str
    purpose: str
    body: str
    updated_at: str


class PromptUpdate(ApiModel):
    body: str
