import type { UserApi } from "../contract.ts"
import { ApiError } from "../errors.ts"
import type {
  ApplicationDetail,
  ApplicationRecord,
  JobAnalysis,
  JobDraft,
  MasterResume,
  Profile,
  ProfileDetails,
  QaPair,
  Session,
  TrackerFilters,
  User,
} from "../../domain/types.ts"
import type { DocumentTemplate } from "../../domain/templates.ts"
import { apiBaseUrl } from "../baseUrl.ts"

const TOKEN_KEY = "aeropicker.token"

function baseUrl(): string {
  return apiBaseUrl()
}

function token(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const current = token()
  if (current) headers.set("Authorization", `Bearer ${current}`)
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers })
  if (response.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event("aeropicker:unauthorized"))
  }
  if (!response.ok) {
    let message = response.statusText || "Request failed."
    try {
      const payload = (await response.json()) as { detail?: unknown }
      if (typeof payload.detail === "string") message = payload.detail
      else if (Array.isArray(payload.detail)) {
        message = payload.detail
          .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : ""))
          .filter(Boolean)
          .join(" ")
      }
    } catch {
      // Keep the status text when the body is not JSON.
    }
    throw new ApiError(message || "Request failed.", response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function remember(session: Session): Session {
  localStorage.setItem(TOKEN_KEY, session.token)
  return session
}

function filterQuery(filters: TrackerFilters): string {
  const params = new URLSearchParams()
  if (filters.profileId) params.set("profileId", filters.profileId)
  if (filters.company.trim()) params.set("company", filters.company.trim())
  if (filters.role.trim()) params.set("role", filters.role.trim())
  if (filters.status) params.set("status", filters.status)
  if (filters.coverLetter) params.set("coverLetter", filters.coverLetter)
  if (filters.handler.trim()) params.set("handler", filters.handler.trim())
  const query = params.toString()
  return query ? `?${query}` : ""
}

export const httpApi: UserApi = {
  async login(input) {
    return remember(await request<Session>("/auth/login", { method: "POST", body: JSON.stringify(input) }))
  },
  async signup(input) {
    return remember(await request<Session>("/auth/signup", { method: "POST", body: JSON.stringify(input) }))
  },
  async logout() {
    try {
      await request<void>("/auth/logout", { method: "POST" })
    } finally {
      localStorage.removeItem(TOKEN_KEY)
    }
  },
  async me() {
    if (!token()) return null
    try {
      return await request<User>("/auth/me")
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  listProfiles() {
    return request<Profile[]>("/profiles")
  },
  createProfile(details: ProfileDetails) {
    return request<Profile>("/profiles", { method: "POST", body: JSON.stringify(details) })
  },
  updateProfile(profileId, details: ProfileDetails) {
    return request<Profile>(`/profiles/${profileId}`, { method: "PUT", body: JSON.stringify(details) })
  },
  getProfile(profileId) {
    return request<Profile>(`/profiles/${profileId}`)
  },
  listResumes(profileId) {
    return request<MasterResume[]>(`/profiles/${profileId}/resumes`)
  },
  uploadResume(profileId, input) {
    const body = new FormData()
    body.set("roleKey", input.roleKey)
    body.set("roleLabel", input.roleLabel)
    body.set("file", input.file)
    return request<MasterResume>(`/profiles/${profileId}/resumes`, { method: "POST", body })
  },
  analyzeResume(profileId, resumeId) {
    return request<MasterResume>(`/profiles/${profileId}/resumes/${resumeId}/analyze`, { method: "POST" })
  },
  async downloadResume(profileId, resumeId) {
    const headers = new Headers()
    const current = token()
    if (current) headers.set("Authorization", `Bearer ${current}`)
    const response = await fetch(`${baseUrl()}/profiles/${profileId}/resumes/${resumeId}/file`, { headers })
    if (!response.ok) throw new ApiError("That PDF is no longer stored.", response.status)
    return response.blob()
  },
  removeResume(profileId, resumeId) {
    return request<void>(`/profiles/${profileId}/resumes/${resumeId}`, { method: "DELETE" })
  },
  getDraft(profileId) {
    return request<JobDraft | null>(`/profiles/${profileId}/draft`)
  },
  tailor(profileId, input) {
    return request<JobAnalysis>(`/profiles/${profileId}/tailor`, {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
  getApplication(applicationId) {
    return request<ApplicationDetail>(`/applications/${applicationId}`)
  },
  listTemplates() {
    return request<DocumentTemplate[]>("/templates")
  },
  setTemplate(applicationId, templateId) {
    return request<ApplicationDetail>(`/applications/${applicationId}/template`, {
      method: "PUT",
      body: JSON.stringify({ templateId }),
    })
  },
  async downloadDocument(applicationId, kind) {
    const headers = new Headers()
    const current = token()
    if (current) headers.set("Authorization", `Bearer ${current}`)
    const response = await fetch(`${baseUrl()}/applications/${applicationId}/documents/${kind}`, { headers })
    if (!response.ok) {
      let message = "Could not build that PDF."
      try {
        const payload = (await response.json()) as { detail?: unknown }
        if (typeof payload.detail === "string") message = payload.detail
      } catch {
        // The body is the PDF only when the request succeeds.
      }
      throw new ApiError(message, response.status)
    }
    return response.blob()
  },
  exportApplication(applicationId) {
    return request<ApplicationDetail>(`/applications/${applicationId}/export`, { method: "POST" })
  },
  askQa(applicationId, questions) {
    return request<QaPair[]>(`/applications/${applicationId}/qa`, {
      method: "POST",
      body: JSON.stringify({ questions }),
    })
  },
  saveQa(applicationId, pairs) {
    return request<QaPair[]>(`/applications/${applicationId}/qa`, {
      method: "PUT",
      body: JSON.stringify({ pairs }),
    })
  },
  finishApplication(applicationId) {
    return request<void>(`/applications/${applicationId}/finish`, { method: "POST" })
  },
  quitApplication(applicationId) {
    return request<void>(`/applications/${applicationId}/quit`, { method: "POST" })
  },
  listApplications(filters) {
    return request<ApplicationRecord[]>(`/applications${filterQuery(filters)}`)
  },
}
