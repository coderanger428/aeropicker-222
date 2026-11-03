import type { AdminApi } from "./contract.ts"
import { ApiError } from "../errors.ts"
import type {
  AdminAccount,
  AdminApplicationRecord,
  AdminProfileOption,
  AdminTrackerFilters,
  AiKey,
  AiPrompt,
  AiUsageEvent,
  ManagedUser,
  SearchResults,
  StatisticsReport,
} from "../../domain/admin.ts"
import { apiBaseUrl } from "../baseUrl.ts"

const TOKEN_KEY = "aeropicker.admin.token"

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
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers })
  if (response.status === 401 && path !== "/admin/login") {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event("aeropicker:admin-unauthorized"))
  }
  if (!response.ok) {
    let message = response.statusText || "Request failed."
    try {
      const payload = (await response.json()) as { detail?: unknown }
      if (typeof payload.detail === "string") message = payload.detail
    } catch {
      // Keep the status text when the body is not JSON.
    }
    throw new ApiError(message || "Request failed.", response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function remember(session: { token: string; user: AdminAccount }) {
  localStorage.setItem(TOKEN_KEY, session.token)
  return session
}

function trackerQuery(filters: AdminTrackerFilters): string {
  const params = new URLSearchParams()
  if (filters.userId) params.set("userId", filters.userId)
  if (filters.profileId) params.set("profileId", filters.profileId)
  if (filters.company.trim()) params.set("company", filters.company.trim())
  if (filters.role.trim()) params.set("role", filters.role.trim())
  if (filters.status) params.set("status", filters.status)
  if (filters.coverLetter) params.set("coverLetter", filters.coverLetter)
  if (filters.handler.trim()) params.set("handler", filters.handler.trim())
  const query = params.toString()
  return query ? `?${query}` : ""
}

export const adminHttp: AdminApi = {
  async login(input) {
    return remember(await request("/admin/login", { method: "POST", body: JSON.stringify(input) }))
  },
  async logout() {
    await request<void>("/admin/logout", { method: "POST" })
    localStorage.removeItem(TOKEN_KEY)
  },
  me() {
    return request<AdminAccount | null>("/admin/me")
  },
  listUsers() {
    return request<ManagedUser[]>("/admin/users")
  },
  getUser(userId) {
    return request<ManagedUser>(`/admin/users/${userId}`)
  },
  updateUser(userId, input) {
    return request<ManagedUser>(`/admin/users/${userId}`, { method: "PUT", body: JSON.stringify(input) })
  },
  setDeleted(userId, deleted) {
    return request<ManagedUser>(`/admin/users/${userId}/deleted`, { method: "POST", body: JSON.stringify({ deleted }) })
  },
  search(query) {
    const params = new URLSearchParams({ q: query })
    return request<SearchResults>(`/admin/search?${params.toString()}`)
  },
  statistics(period) {
    return request<StatisticsReport>(`/admin/statistics?period=${period}`)
  },
  listApplications(filters) {
    return request<AdminApplicationRecord[]>(`/admin/applications${trackerQuery(filters)}`)
  },
  listProfiles(userId) {
    return request<AdminProfileOption[]>(`/admin/users/${userId}/profiles`)
  },
  listAiKeys() {
    return request<AiKey[]>("/admin/ai/keys")
  },
  listAiUsage(keyId) {
    const query = keyId ? `?keyId=${encodeURIComponent(keyId)}` : ""
    return request<AiUsageEvent[]>(`/admin/ai/usage${query}`)
  },
  createAiKey(input) {
    return request<AiKey>("/admin/ai/keys", { method: "POST", body: JSON.stringify(input) })
  },
  testAiKey(keyId, message) {
    return request<{ reply: string; model: string }>(`/admin/ai/keys/${keyId}/test`, {
      method: "POST",
      body: JSON.stringify({ message }),
    })
  },
  revokeAiKey(keyId) {
    return request<AiKey>(`/admin/ai/keys/${keyId}/revoke`, { method: "POST" })
  },
  listPrompts() {
    return request<AiPrompt[]>("/admin/ai/prompts")
  },
  updatePrompt(promptId, body) {
    return request<AiPrompt>(`/admin/ai/prompts/${promptId}`, { method: "PUT", body: JSON.stringify({ body }) })
  },
}
