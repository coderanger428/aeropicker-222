import type {
  ApplicationStatus,
  CoverLetterDocument,
  ExportedFile,
  ResumeJson,
  ProfileDetails,
  QaPair,
  ResumeDocument,
  TailorPacket,
} from "../../domain/types.ts"
import { extractKeywords } from "../../domain/keywords.ts"
import { RESUME_PARSE_RULES } from "../../domain/resumeAnalyze.ts"
import { coerceDetails, emptyDetails } from "../../domain/profileForm.ts"
import { buildCoverLetter, buildExportFiles, buildResume } from "./generate.ts"

export interface StoredUser {
  id: string
  name: string
  email: string
  password: string
  role: "user" | "admin"
  deletedAt: string | null
}

export interface StoredAiKey {
  id: string
  name: string
  provider: string
  secret: string
  projectName: string
  projectNumber: string
  organizationId: string
  projectId: string
  createdAt: string
  revokedAt: string | null
  tokensIn: number
  tokensOut: number
}

export interface StoredAiUsage {
  id: string
  keyId: string
  at: string
  model: string
  purpose: string
  promptTokens: number
  outputTokens: number
  thoughtTokens: number
  totalTokens: number
}

export interface StoredPrompt {
  id: string
  name: string
  purpose: string
  body: string
  updatedAt: string
}

export interface StoredProfile {
  id: string
  userId: string
  name: string
  headline: string
  createdAt: string
  details: ProfileDetails
}

export interface StoredResume {
  id: string
  profileId: string
  roleKey: string
  roleLabel: string
  fileName: string
  uploadedAt: string
  text: string
  content?: ResumeJson | null
}

export interface StoredApplication {
  id: string
  profileId: string
  company: string
  jobTitle: string
  jobLink: string
  jobDescription: string
  generateCoverLetter: boolean
  baseResumeId: string
  resumeLabel: string
  candidateName: string
  status: ApplicationStatus
  open: boolean
  createdAt: string
  updatedAt: string
  handler: string
  templateId?: string
  tailorInput?: TailorPacket | null
  resume: ResumeDocument
  coverLetter: CoverLetterDocument | null
  qa: QaPair[]
  files: ExportedFile[]
}

export interface Db {
  version: 1
  sessionUserId: string | null
  adminSessionUserId: string | null
  seq: number
  appSeq: number
  users: StoredUser[]
  profiles: StoredProfile[]
  resumes: StoredResume[]
  applications: StoredApplication[]
  aiKeys: StoredAiKey[]
  aiUsage: StoredAiUsage[]
  prompts: StoredPrompt[]
}

export const STORAGE_KEY = "aeropicker.mock.v1"

function sampleApplication(input: {
  id: string
  company: string
  jobTitle: string
  jobLink: string
  jobDescription: string
  roleLabel: string
  baseResumeId: string
  generateCoverLetter: boolean
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
  profileId?: string
  candidateName?: string
  handler?: string
}): StoredApplication {
  const candidateName = input.candidateName ?? "Alex Rivera"
  const keywords = extractKeywords(input.jobDescription)
  const context = {
    candidateName,
    roleLabel: input.roleLabel,
    company: input.company,
    jobTitle: input.jobTitle,
    keywords,
  }
  const resume = buildResume(context)
  const coverLetter = input.generateCoverLetter ? buildCoverLetter(context) : null
  const record: StoredApplication = {
    id: input.id,
    profileId: input.profileId ?? "pro-platform",
    company: input.company,
    jobTitle: input.jobTitle,
    jobLink: input.jobLink,
    jobDescription: input.jobDescription,
    generateCoverLetter: input.generateCoverLetter,
    baseResumeId: input.baseResumeId,
    resumeLabel: input.roleLabel,
    candidateName,
    status: input.status,
    open: false,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    handler: input.handler ?? candidateName,
    resume,
    coverLetter,
    qa: [],
    files: [],
  }
  if (input.status === "submitted" || input.status === "exported") {
    record.files = buildExportFiles(record)
  }
  return record
}

export function createSeed(): Db {
  const applications = [
    sampleApplication({
      id: "AP-1037",
      company: "Northwind Analytics",
      jobTitle: "Backend Engineer",
      jobLink: "https://jobs.example.com/northwind/backend",
      jobDescription:
        "Build Python services for billing. Experience with Postgres, APIs, and on-call delivery is required.",
      roleLabel: "Backend Engineer",
      baseResumeId: "res-be",
      generateCoverLetter: true,
      status: "tailored",
      createdAt: "2026-09-28T15:00:00.000Z",
      updatedAt: "2026-09-28T15:10:00.000Z",
    }),
    sampleApplication({
      id: "AP-1038",
      company: "Lumen Field",
      jobTitle: "Frontend Engineer",
      jobLink: "https://jobs.example.com/lumen/frontend",
      jobDescription:
        "Own React UI for an internal design system. Accessibility, TypeScript, and component design matter here.",
      roleLabel: "Frontend Engineer",
      baseResumeId: "res-fe",
      generateCoverLetter: false,
      status: "submitted",
      createdAt: "2026-10-02T15:00:00.000Z",
      updatedAt: "2026-10-03T18:20:00.000Z",
    }),
    sampleApplication({
      id: "AP-1039",
      company: "Harbor & Co",
      jobTitle: "ERP Integration Lead",
      jobLink: "https://jobs.example.com/harbor/erp",
      jobDescription:
        "Connect Salesforce and NetSuite to the order platform. CRM workflows and reliable integrations are the job.",
      roleLabel: "ERP/CRM Integration Engineer",
      baseResumeId: "res-erp",
      generateCoverLetter: true,
      status: "quit",
      createdAt: "2026-10-18T15:00:00.000Z",
      updatedAt: "2026-10-18T16:00:00.000Z",
    }),
    sampleApplication({
      id: "AP-1040",
      company: "Kepler Data",
      jobTitle: "Data Scientist",
      jobLink: "https://jobs.example.com/kepler/data",
      jobDescription:
        "Model customer retention and explain the results to product partners. Python, experimentation, and clear writing.",
      roleLabel: "Data Scientist",
      baseResumeId: "res-ds",
      generateCoverLetter: true,
      status: "exported",
      createdAt: "2026-10-21T15:00:00.000Z",
      updatedAt: "2026-10-21T15:40:00.000Z",
    }),
    sampleApplication({
      id: "AP-1041",
      company: "Paperlane",
      jobTitle: "Full Stack Engineer",
      jobLink: "https://jobs.example.com/paperlane/fullstack",
      jobDescription:
        "Ship product features across a TypeScript client and a Python API. We care about maintainable full stack delivery.",
      roleLabel: "Full Stack Engineer",
      baseResumeId: "res-fs",
      generateCoverLetter: true,
      status: "submitted",
      createdAt: "2026-10-28T15:00:00.000Z",
      updatedAt: "2026-10-29T11:05:00.000Z",
    }),
    sampleApplication({
      id: "AP-1101",
      company: "Northbeam",
      jobTitle: "Product Engineer",
      jobLink: "https://jobs.example.com/northbeam/product",
      jobDescription: "Ship product workflows and partner with design on the customer console.",
      roleLabel: "Full Stack Engineer",
      baseResumeId: "",
      generateCoverLetter: true,
      status: "submitted",
      createdAt: "2026-10-24T15:00:00.000Z",
      updatedAt: "2026-10-24T16:10:00.000Z",
      profileId: "pro-jordan",
      candidateName: "Jordan Hale",
    }),
    sampleApplication({
      id: "AP-1102",
      company: "Fieldguide",
      jobTitle: "Platform Engineer",
      jobLink: "https://jobs.example.com/fieldguide/platform",
      jobDescription: "Build the platform API used by internal tools and customer integrations.",
      roleLabel: "Backend Engineer",
      baseResumeId: "",
      generateCoverLetter: false,
      status: "tailored",
      createdAt: "2026-10-30T15:00:00.000Z",
      updatedAt: "2026-10-30T15:20:00.000Z",
      profileId: "pro-jordan",
      candidateName: "Jordan Hale",
    }),
  ]

  return {
    version: 1,
    sessionUserId: null,
    adminSessionUserId: null,
    seq: 40,
    appSeq: 1041,
    users: [
      {
        id: "usr-demo",
        name: "Alex Rivera",
        email: "demo@aeropicker.dev",
        password: "demo",
        role: "user",
        deletedAt: null,
      },
      {
        id: "usr-jordan",
        name: "Jordan Hale",
        email: "jordan@aeropicker.dev",
        password: "jordan",
        role: "user",
        deletedAt: null,
      },
      {
        id: "usr-admin",
        name: "Admin",
        email: "admin@aeropicker.dev",
        password: "admin",
        role: "admin",
        deletedAt: null,
      },
    ],
    profiles: [
      {
        id: "pro-platform",
        userId: "usr-demo",
        name: "Platform",
        headline: "Product engineering seat",
        createdAt: "2026-09-01T12:00:00.000Z",
        details: emptyDetails("Platform"),
      },
      {
        id: "pro-fresh",
        userId: "usr-demo",
        name: "Fresh search",
        headline: "Exploring a new lane",
        createdAt: "2026-10-20T12:00:00.000Z",
        details: emptyDetails("Fresh search"),
      },
      {
        id: "pro-jordan",
        userId: "usr-jordan",
        name: "Product",
        headline: "Product engineering",
        createdAt: "2026-10-01T12:00:00.000Z",
        details: emptyDetails("Product"),
      },
    ],
    resumes: [],
    applications,
    aiKeys: defaultAiKeys(),
    aiUsage: [],
    prompts: defaultPrompts(),
  }
}

function googleDemoKey(): StoredAiKey | null {
  const secret = import.meta.env.VITE_GOOGLE_API_KEY?.trim()
  if (!secret) return null
  return {
    id: "key-google-resume",
    name: import.meta.env.VITE_GOOGLE_API_KEY_NAME?.trim() || "Resume Builder Dev Key",
    provider: "Google",
    secret,
    projectName: import.meta.env.VITE_GOOGLE_PROJECT_NAME?.trim() || "",
    projectNumber: import.meta.env.VITE_GOOGLE_PROJECT_NUMBER?.trim() || "",
    organizationId: "",
    projectId: "",
    createdAt: "2026-10-31T01:00:00.000Z",
    revokedAt: null,
    tokensIn: 0,
    tokensOut: 0,
  }
}

const SAMPLE_KEY_IDS = new Set(["key-openai", "key-anthropic"])

function defaultAiKeys(): StoredAiKey[] {
  const google = googleDemoKey()
  return google ? [google] : []
}

function defaultPrompts(): StoredPrompt[] {
  return [
    {
      id: "master-resume-parser",
      name: "Master resume parser",
      purpose: "Read an uploaded master resume and return resume JSON. Company names and work periods follow the profile.",
      body: RESUME_PARSE_RULES,
      updatedAt: "2026-10-01T12:00:00.000Z",
    },
    {
      id: "resume-tailor",
      name: "Tailor prompt",
      purpose: "Read the raw job description, tailor the master resume, and write the cover letter without inventing experience.",
      body: "Tailor the master resume to the raw job description and write the cover letter. Use every key skill, preferred skill, and useful expression.",
      updatedAt: "2026-10-01T12:00:00.000Z",
    },
    {
      id: "qa-session",
      name: "QA session",
      purpose: "Draft an answer for each question on the application form.",
      body: "Answer each application question in the first person. Use the tailored resume and the job description. Do not invent employers, dates, or tools. Keep each answer specific to that question.",
      updatedAt: "2026-10-01T12:00:00.000Z",
    },
  ]
}

function ensureAdminData(stored: Db): void {
  for (const user of stored.users) {
    if (user.role !== "admin" && user.role !== "user") user.role = "user"
    if (user.deletedAt === undefined) user.deletedAt = null
  }
  if (stored.adminSessionUserId === undefined) stored.adminSessionUserId = null
  const seed = createSeed()
  for (const user of seed.users) {
    if (!stored.users.some((item) => item.id === user.id || item.email === user.email)) stored.users.push(user)
  }
  for (const profile of seed.profiles) {
    if (!stored.profiles.some((item) => item.id === profile.id)) stored.profiles.push(profile)
  }
  for (const application of seed.applications) {
    if (application.profileId === "pro-jordan" && !stored.applications.some((item) => item.id === application.id)) {
      stored.applications.push(application)
    }
  }
  if (!Array.isArray(stored.resumes)) stored.resumes = []
  stored.resumes = stored.resumes.filter((resume) => typeof resume.text === "string" && resume.text.trim().length > 0)
  if (!Array.isArray(stored.aiUsage)) stored.aiUsage = []
  stored.aiUsage = stored.aiUsage.filter((event) => !SAMPLE_KEY_IDS.has(event.keyId))
  if (!Array.isArray(stored.aiKeys)) stored.aiKeys = seed.aiKeys
  else {
    stored.aiKeys = stored.aiKeys.filter((key) => !SAMPLE_KEY_IDS.has(key.id))
    for (const key of stored.aiKeys) {
      if (!key.projectName) key.projectName = ""
      if (!key.projectNumber) key.projectNumber = ""
      if (!key.organizationId) key.organizationId = ""
      if (!key.projectId) key.projectId = ""
    }
    for (const key of seed.aiKeys) {
      if (!stored.aiKeys.some((item) => item.id === key.id)) stored.aiKeys.unshift(key)
    }
  }
  if (!Array.isArray(stored.prompts)) stored.prompts = seed.prompts
  else {
    const saved = new Map(stored.prompts.map((prompt) => [prompt.id, prompt]))
    stored.prompts = seed.prompts.map((prompt) => {
      const existing = saved.get(prompt.id)
      return existing ? { ...existing, name: prompt.name, purpose: prompt.purpose } : prompt
    })
  }
}

export function loadDb(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed?.version === 1 && Array.isArray(parsed.users) && Array.isArray(parsed.profiles)) {
        parsed.profiles = parsed.profiles.map((profile) => ({
          ...profile,
          details: coerceDetails(profile.details, profile.name),
        }))
        ensureAdminData(parsed)
        saveDb(parsed)
        return parsed
      }
    }
  } catch {
    // Ignore a broken cache and seed again.
  }
  const seeded = createSeed()
  saveDb(seeded)
  return seeded
}

export const db = loadDb()

export function saveDb(db: Db): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}
