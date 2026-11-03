import type { UserApi } from "../contract.ts"
import { ApiError } from "../errors.ts"
import type {
  ApplicationDetail,
  ApplicationRecord,
  JobDraft,
  MasterResume,
  Profile,
  QaPair,
  TrackerFilters,
  User,
} from "../../domain/types.ts"
import { pdfRejection } from "../../domain/files.ts"
import { extractPdfText, resumeExcerpt } from "../../domain/pdfText.ts"
import { staticResumeAnalyzer } from "../../domain/resumeAnalyze.ts"
import { deleteResumeFile, saveResumeFile } from "./resumeFiles.ts"

async function readResumeFile(id: string): Promise<Blob | null> {
  const request = indexedDB.open("aeropicker.files")
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open resume storage."))
  })
  const file = await new Promise<Blob | null>((resolve, reject) => {
    const get = database.transaction("resumes").objectStore("resumes").get(id)
    get.onsuccess = () => resolve((get.result as Blob | undefined) ?? null)
    get.onerror = () => reject(get.error ?? new Error("Could not read the PDF."))
  })
  database.close()
  return file
}
import { classicLetterLines, classicLetterView, classicResumeLines, classicResumeView, documentFiles } from "../../domain/classicDocument.ts"
import { DOCUMENT_TEMPLATES } from "../../domain/templates.ts"
import { buildPdf } from "../../lib/pdf.ts"
import { extractKeywords } from "../../domain/keywords.ts"
import { canonicalRole, hasRequiredResume } from "../../domain/roles.ts"
import { coerceDetails, normalizeProfileDetails, validateProfileDetails } from "../../domain/profileForm.ts"
import { validateJobLink } from "../../domain/validate.ts"
import {
  db,
  saveDb,
  type StoredApplication,
  type StoredProfile,
  type StoredResume,
  type StoredUser,
} from "./db.ts"
import { buildExportFiles, draftAnswers } from "./generate.ts"

function settle(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 140)
  })
}

function persist(): void {
  try {
    saveDb(db)
  } catch {
    throw new ApiError("Could not save this browser session.")
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function publicUser(user: StoredUser): User {
  return { id: user.id, name: user.name, email: user.email }
}

function requireUser(): StoredUser {
  const user = db.users.find((item) => item.id === db.sessionUserId)
  if (!user) throw new ApiError("Sign in required.", 401)
  return user
}

function requireProfile(userId: string, profileId: string): StoredProfile {
  const profile = db.profiles.find((item) => item.id === profileId && item.userId === userId)
  if (!profile) throw new ApiError("That profile is not on this account.", 404)
  return profile
}

function profileView(profile: StoredProfile): Profile {
  const resumes = db.resumes.filter((resume) => resume.profileId === profile.id)
  return {
    id: profile.id,
    name: profile.name,
    headline: profile.headline,
    createdAt: profile.createdAt,
    resumeCount: resumes.length,
    applicationCount: db.applications.filter((application) => application.profileId === profile.id).length,
    hasRequiredResume: hasRequiredResume(resumes),
    details: coerceDetails(profile.details, profile.name),
  }
}

function requireApplication(userId: string, applicationId: string): StoredApplication {
  const application = db.applications.find((item) => item.id === applicationId)
  if (!application) throw new ApiError("That application could not be found.", 404)
  requireProfile(userId, application.profileId)
  return application
}

function toDetail(application: StoredApplication, profileName: string): ApplicationDetail {
  return clone({
    id: application.id,
    profileId: application.profileId,
    profileName,
    company: application.company,
    jobTitle: application.jobTitle,
    jobLink: application.jobLink,
    jobDescription: application.jobDescription,
    generateCoverLetter: application.generateCoverLetter,
    baseResumeId: application.baseResumeId,
    resumeLabel: application.resumeLabel,
    candidateName: application.candidateName,
    status: application.status,
    open: application.open,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    handler: application.handler,
    templateId: application.templateId || "classic",
    tailorInput: application.tailorInput ?? null,
    resume: application.resume,
    coverLetter: application.coverLetter,
    qa: application.qa,
    files: documentFiles(application),
  })
}

function toRecord(application: StoredApplication, profileName: string): ApplicationRecord {
  return {
    id: application.id,
    date: application.createdAt,
    profileId: application.profileId,
    profileName,
    company: application.company,
    role: application.jobTitle,
    jobLink: application.jobLink,
    resume: application.resumeLabel,
    hasCoverLetter: application.generateCoverLetter,
    status: application.status,
    lastUpdate: application.updatedAt,
    handler: application.handler,
  }
}

function nextId(prefix: string): string {
  db.seq += 1
  return `${prefix}-${db.seq}`
}

function resumeView(resume: StoredResume): MasterResume {
  return {
    id: resume.id,
    profileId: resume.profileId,
    roleKey: resume.roleKey,
    roleLabel: resume.roleLabel,
    fileName: resume.fileName,
    uploadedAt: resume.uploadedAt,
    characterCount: resume.text.length,
    excerpt: resumeExcerpt(resume.text),
    appliedCount: db.applications.filter((application) => application.baseResumeId === resume.id).length,
    content: resume.content ?? null,
  }
}

export const mockApi: UserApi = {
  async login(input) {
    await settle()
    const email = input.email.trim().toLowerCase()
    const user = db.users.find((item) => item.email === email)
    if (!user || user.password !== input.password || user.role === "admin") {
      throw new ApiError("Email or password is incorrect.")
    }
    if (user.deletedAt) throw new ApiError("This account is marked deleted.")
    db.sessionUserId = user.id
    persist()
    return { token: `mock:${user.id}`, user: publicUser(user) }
  },

  async signup(input) {
    await settle()
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    if (!name) throw new ApiError("Enter your name.")
    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      throw new ApiError("Enter a valid email.")
    }
    if (input.password.length < 4) throw new ApiError("Use at least 4 characters for the password.")
    if (db.users.some((item) => item.email === email)) {
      throw new ApiError("An account with that email already exists.")
    }
    const user: StoredUser = { id: nextId("usr"), name, email, password: input.password, role: "user", deletedAt: null }
    db.users.push(user)
    db.sessionUserId = user.id
    persist()
    return { token: `mock:${user.id}`, user: publicUser(user) }
  },

  async logout() {
    await settle()
    db.sessionUserId = null
    persist()
  },

  async me() {
    await settle()
    if (!db.sessionUserId) return null
    const user = db.users.find((item) => item.id === db.sessionUserId)
    if (!user) {
      db.sessionUserId = null
      persist()
      return null
    }
    return publicUser(user)
  },

  async listProfiles() {
    await settle()
    const user = requireUser()
    return db.profiles.filter((profile) => profile.userId === user.id).map(profileView)
  },

  async createProfile(details) {
    await settle()
    const user = requireUser()
    const cleaned = normalizeProfileDetails(details)
    const problem = validateProfileDetails(cleaned)
    if (problem) throw new ApiError(problem)
    const profile: StoredProfile = {
      id: nextId("pro"),
      userId: user.id,
      name: cleaned.fullName,
      headline: "",
      createdAt: new Date().toISOString(),
      details: cleaned,
    }
    db.profiles.unshift(profile)
    persist()
    return profileView(profile)
  },

  async updateProfile(profileId, details) {
    await settle()
    const user = requireUser()
    const profile = requireProfile(user.id, profileId)
    const cleaned = normalizeProfileDetails(details)
    const problem = validateProfileDetails(cleaned)
    if (problem) throw new ApiError(problem)
    profile.name = cleaned.fullName
    profile.details = cleaned
    persist()
    return profileView(profile)
  },

  async getProfile(profileId) {
    await settle()
    const user = requireUser()
    return profileView(requireProfile(user.id, profileId))
  },

  async listResumes(profileId) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    return db.resumes.filter((resume) => resume.profileId === profileId).map(resumeView)
  },

  async uploadResume(profileId, input) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    const rejection = pdfRejection(input.file)
    if (rejection) throw new ApiError(rejection)
    const role = canonicalRole(input.roleKey, input.roleLabel)
    if ("error" in role) throw new ApiError(role.error)
    const now = new Date().toISOString()
    const existing = db.resumes.find((resume) => resume.profileId === profileId && resume.roleKey === role.roleKey)
    const record: StoredResume = existing ?? {
      id: nextId("res"),
      profileId,
      roleKey: role.roleKey,
      roleLabel: role.roleLabel,
      fileName: input.file.name,
      uploadedAt: now,
      text: "",
      content: null,
    }
    try {
      await saveResumeFile(record.id, input.file)
    } catch {
      throw new ApiError("Could not store that PDF.")
    }
    record.roleLabel = role.roleLabel
    record.fileName = input.file.name
    record.uploadedAt = now
    record.text = ""
    record.content = null
    if (!existing) db.resumes.push(record)
    persist()
    return resumeView(record)
  },

  async analyzeResume(profileId, resumeId) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    const resume = db.resumes.find((item) => item.id === resumeId && item.profileId === profileId)
    if (!resume) throw new ApiError("That PDF is no longer stored.", 404)
    const file = await readResumeFile(resumeId)
    if (!file) throw new ApiError("That PDF is no longer stored.", 404)
    let text = ""
    try {
      text = await extractPdfText(new Uint8Array(await file.arrayBuffer()))
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Could not read text from that PDF.")
    }
    resume.text = text
    resume.content = staticResumeAnalyzer.analyze(text)
    persist()
    return resumeView(resume)
  },

  async downloadResume(profileId, resumeId) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    const resume = db.resumes.find((item) => item.id === resumeId && item.profileId === profileId)
    if (!resume) throw new ApiError("That PDF is no longer stored.", 404)
    const file = await readResumeFile(resumeId)
    if (!file) throw new ApiError("That PDF is no longer stored.", 404)
    return file
  },

  async removeResume(profileId, resumeId) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    const index = db.resumes.findIndex((resume) => resume.id === resumeId && resume.profileId === profileId)
    if (index < 0) throw new ApiError("That resume is no longer on this profile.", 404)
    const [removed] = db.resumes.splice(index, 1)
    persist()
    if (removed) await deleteResumeFile(removed.id).catch(() => undefined)
  },

  async getDraft(profileId) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    const open = db.applications.find((application) => application.profileId === profileId && application.open)
    if (!open) return null
    const draft: JobDraft = {
      applicationId: open.id,
      status: open.status === "exported" ? "exported" : "tailored",
      company: open.company,
      jobTitle: open.jobTitle,
      jobLink: open.jobLink,
      jobDescription: open.jobDescription,
      generateCoverLetter: open.generateCoverLetter,
      baseResumeId: open.baseResumeId,
    }
    return draft
  },

  async tailor(profileId, input) {
    await settle()
    const user = requireUser()
    requireProfile(user.id, profileId)
    const resumes = db.resumes.filter((resume) => resume.profileId === profileId)
    if (!hasRequiredResume(resumes)) {
      throw new ApiError("Upload a Full Stack Engineer resume before tailoring.")
    }
    const base = resumes.find((resume) => resume.id === input.baseResumeId)
    if (!base) throw new ApiError("Choose a master resume from this profile.")
    if (!base.content) throw new ApiError("Analyze that master resume before tailoring.")
    const company = input.company.trim()
    const jobTitle = input.jobTitle.trim()
    const jobDescription = input.jobDescription.trim()
    const jobLink = input.jobLink.trim()
    if (!company) throw new ApiError("Enter the company.")
    if (!jobTitle) throw new ApiError("Enter the job title.")
    if (!jobDescription) throw new ApiError("Paste the job description.")
    const linkError = validateJobLink(jobLink)
    if (linkError) throw new ApiError(linkError)

    return { file: "Downloads/tailor-result.txt", applicationId: "" }
  },

  async listTemplates() {
    await settle()
    return DOCUMENT_TEMPLATES.map((item) => ({ id: item.id, label: item.label }))
  },

  async setTemplate(applicationId, templateId) {
    await settle()
    const user = requireUser()
    if (!DOCUMENT_TEMPLATES.some((item) => item.id === templateId)) {
      throw new ApiError("Choose a template from the list.")
    }
    const application = requireApplication(user.id, applicationId)
    if (!application.open) throw new ApiError("This application is already closed.", 409)
    application.templateId = templateId
    application.updatedAt = new Date().toISOString()
    persist()
    const profile = requireProfile(user.id, application.profileId)
    return toDetail(application, profile.name)
  },

  async downloadDocument(applicationId, kind) {
    await settle()
    const user = requireUser()
    const application = requireApplication(user.id, applicationId)
    if (kind !== "resume" && kind !== "cover-letter") {
      throw new ApiError("That document is not on this application.", 404)
    }
    if (kind === "cover-letter" && !application.coverLetter) {
      throw new ApiError("This application has no cover letter.", 404)
    }
    if (application.open && application.status === "tailored") {
      application.status = "exported"
      application.updatedAt = new Date().toISOString()
      persist()
    }
    const profile = requireProfile(user.id, application.profileId)
    const detail = toDetail(application, profile.name)
    const lines =
      kind === "cover-letter" && detail.coverLetter
        ? classicLetterLines(classicLetterView(detail, detail.coverLetter, profile.details))
        : classicResumeLines(classicResumeView(detail, profile.details))
    return buildPdf(lines)
  },

  async getApplication(applicationId) {
    await settle()
    const user = requireUser()
    const application = requireApplication(user.id, applicationId)
    const profile = requireProfile(user.id, application.profileId)
    return toDetail(application, profile.name)
  },

  async exportApplication(applicationId) {
    await settle()
    const user = requireUser()
    const application = requireApplication(user.id, applicationId)
    if (!application.open) throw new ApiError("This application is already closed.", 409)
    application.files = buildExportFiles(application)
    application.status = "exported"
    application.updatedAt = new Date().toISOString()
    persist()
    const profile = requireProfile(user.id, application.profileId)
    return toDetail(application, profile.name)
  },

  async askQa(applicationId, questions) {
    await settle()
    const user = requireUser()
    const application = requireApplication(user.id, applicationId)
    if (!application.open) throw new ApiError("This application is already closed.", 409)
    const cleaned = questions.map((question) => question.trim()).filter(Boolean)
    if (cleaned.length === 0) throw new ApiError("Paste at least one question.")
    application.qa = draftAnswers(cleaned, {
      candidateName: application.candidateName,
      company: application.company,
      jobTitle: application.jobTitle,
      keywords: extractKeywords(`${application.jobDescription}\n${cleaned.join("\n")}`),
    })
    application.updatedAt = new Date().toISOString()
    persist()
    return clone(application.qa)
  },

  async saveQa(applicationId, pairs) {
    await settle()
    const user = requireUser()
    const application = requireApplication(user.id, applicationId)
    if (!application.open) throw new ApiError("This application is already closed.", 409)
    application.qa = pairs
      .map((pair, index) => ({
        id: pair.id || `qa-${index + 1}`,
        question: pair.question.trim(),
        answer: pair.answer,
      }))
      .filter((pair) => pair.question)
    application.updatedAt = new Date().toISOString()
    persist()
    return clone(application.qa)
  },

  async finishApplication(applicationId) {
    await settle()
    closeApplication(applicationId, "submitted")
  },

  async quitApplication(applicationId) {
    await settle()
    closeApplication(applicationId, "quit")
  },

  async listApplications(filters) {
    await settle()
    const user = requireUser()
    const ownProfiles = new Map(
      db.profiles.filter((profile) => profile.userId === user.id).map((profile) => [profile.id, profile.name]),
    )
    return db.applications
      .filter((application) => ownProfiles.has(application.profileId) && matches(application, filters))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((application) => toRecord(application, ownProfiles.get(application.profileId) ?? "Profile"))
  },
}

function closeApplication(applicationId: string, status: "submitted" | "quit"): void {
  const user = requireUser()
  const application = requireApplication(user.id, applicationId)
  if (!application.open) throw new ApiError("This application is already closed.", 409)
  if (status === "submitted" && application.status !== "exported") {
    throw new ApiError("Download the resume before finishing.", 409)
  }
  application.status = status
  application.open = false
  application.updatedAt = new Date().toISOString()
  persist()
}

function matches(application: StoredApplication, filters: TrackerFilters): boolean {
  if (filters.profileId && application.profileId !== filters.profileId) return false
  if (filters.company && !application.company.toLowerCase().includes(filters.company.trim().toLowerCase())) return false
  if (filters.role && !application.jobTitle.toLowerCase().includes(filters.role.trim().toLowerCase())) return false
  if (filters.status && application.status !== filters.status) return false
  if (filters.coverLetter === "yes" && !application.generateCoverLetter) return false
  if (filters.coverLetter === "no" && application.generateCoverLetter) return false
  if (filters.handler && !application.handler.toLowerCase().includes(filters.handler.trim().toLowerCase())) return false
  return true
}
