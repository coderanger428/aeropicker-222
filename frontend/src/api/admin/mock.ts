import type { AdminApi } from "./contract.ts"
import { ApiError } from "../errors.ts"
import { db, saveDb, type StoredAiKey, type StoredApplication, type StoredUser } from "../mock/db.ts"
import {
  validateNewAiKey,
  type AdminAccount,
  type AdminApplicationRecord,
  type AdminTrackerFilters,
  type AiKey,
  type AiPrompt,
  type ManagedUser,
} from "../../domain/admin.ts"
import { statisticsReport } from "../../domain/adminStats.ts"
import { randomId } from "../../lib/randomId.ts"

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

function account(user: StoredUser): AdminAccount {
  return { id: user.id, name: user.name, email: user.email }
}

function requireAdmin(): StoredUser {
  const user = db.users.find((item) => item.id === db.adminSessionUserId)
  if (!user || user.role !== "admin") throw new ApiError("Sign in required.", 401)
  return user
}

function applicationCount(userId: string): number {
  const profileIds = new Set(db.profiles.filter((profile) => profile.userId === userId).map((profile) => profile.id))
  return db.applications.filter((application) => profileIds.has(application.profileId)).length
}

function managedUser(user: StoredUser): ManagedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profileCount: db.profiles.filter((profile) => profile.userId === user.id).length,
    applicationCount: applicationCount(user.id),
    deletedAt: user.deletedAt,
  }
}

function appUsers(): StoredUser[] {
  return db.users.filter((user) => user.role !== "admin")
}

function requireAppUser(userId: string): StoredUser {
  const user = appUsers().find((item) => item.id === userId)
  if (!user) throw new ApiError("That user could not be found.", 404)
  return user
}

function toAdminRecord(application: StoredApplication): AdminApplicationRecord | null {
  const profile = db.profiles.find((item) => item.id === application.profileId)
  const user = profile ? db.users.find((item) => item.id === profile.userId) : undefined
  if (!profile || !user || user.role === "admin") return null
  return {
    id: application.id,
    date: application.createdAt,
    profileId: profile.id,
    profileName: profile.name,
    company: application.company,
    role: application.jobTitle,
    jobLink: application.jobLink,
    resume: application.resumeLabel,
    hasCoverLetter: application.generateCoverLetter,
    status: application.status,
    lastUpdate: application.updatedAt,
    handler: application.handler,
    userId: user.id,
    userName: user.name,
  }
}

function matchesTracker(row: AdminApplicationRecord, filters: AdminTrackerFilters): boolean {
  if (filters.userId && row.userId !== filters.userId) return false
  if (filters.profileId && row.profileId !== filters.profileId) return false
  if (filters.company && !row.company.toLowerCase().includes(filters.company.trim().toLowerCase())) return false
  if (filters.role && !row.role.toLowerCase().includes(filters.role.trim().toLowerCase())) return false
  if (filters.status && row.status !== filters.status) return false
  if (filters.coverLetter === "yes" && !row.hasCoverLetter) return false
  if (filters.coverLetter === "no" && row.hasCoverLetter) return false
  if (filters.handler && !row.handler.toLowerCase().includes(filters.handler.trim().toLowerCase())) return false
  return true
}

function publicKey(key: StoredAiKey): AiKey {
  return {
    id: key.id,
    name: key.name,
    provider: key.provider,
    lastFour: key.secret.slice(-4),
    projectName: key.projectName || "",
    projectNumber: key.projectNumber || "",
    organizationId: key.organizationId || "",
    projectId: key.projectId || "",
    createdAt: key.createdAt,
    revokedAt: key.revokedAt,
    tokensIn: key.tokensIn,
    tokensOut: key.tokensOut,
  }
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const adminMock: AdminApi = {
  async login(input) {
    await settle()
    const email = input.email.trim().toLowerCase()
    const user = db.users.find((item) => item.email === email && item.role === "admin")
    if (!user || user.password !== input.password) throw new ApiError("Email or password is incorrect.")
    db.adminSessionUserId = user.id
    persist()
    return { token: `admin:${user.id}`, user: account(user) }
  },

  async logout() {
    await settle()
    db.adminSessionUserId = null
    persist()
  },

  async me() {
    await settle()
    if (!db.adminSessionUserId) return null
    const user = db.users.find((item) => item.id === db.adminSessionUserId && item.role === "admin")
    if (!user) {
      db.adminSessionUserId = null
      persist()
      return null
    }
    return account(user)
  },

  async listUsers() {
    await settle()
    requireAdmin()
    return appUsers().map(managedUser)
  },

  async getUser(userId) {
    await settle()
    requireAdmin()
    return managedUser(requireAppUser(userId))
  },

  async updateUser(userId, input) {
    await settle()
    requireAdmin()
    const user = requireAppUser(userId)
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    if (!name) throw new ApiError("Enter a name.")
    if (name.length > 80) throw new ApiError("Name must be 80 characters or fewer.")
    if (!validEmail(email)) throw new ApiError("Enter a valid email.")
    if (db.users.some((item) => item.email === email && item.id !== user.id)) {
      throw new ApiError("An account with that email already exists.")
    }
    user.name = name
    user.email = email
    persist()
    return managedUser(user)
  },

  async setDeleted(userId, deleted) {
    await settle()
    requireAdmin()
    const user = requireAppUser(userId)
    user.deletedAt = deleted ? new Date().toISOString() : null
    persist()
    return managedUser(user)
  },

  async search(query) {
    await settle()
    requireAdmin()
    const needle = query.trim().toLowerCase()
    if (!needle) return { users: [], applications: [] }
    const users = appUsers()
      .filter((user) => user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle))
      .map(managedUser)
    const applications = db.applications
      .map(toAdminRecord)
      .filter((row): row is AdminApplicationRecord => row !== null)
      .filter((row) =>
        [row.userName, row.profileName, row.company, row.role, row.jobLink, row.handler, row.resume].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
    return { users, applications }
  },

  async statistics(period) {
    await settle()
    requireAdmin()
    return statisticsReport(
      {
        users: db.users.map((user) => ({ id: user.id, name: user.name, role: user.role, deletedAt: user.deletedAt })),
        profiles: db.profiles.map((profile) => ({ id: profile.id, userId: profile.userId })),
        applications: db.applications.map((application) => ({
          profileId: application.profileId,
          createdAt: application.createdAt,
        })),
      },
      period,
    )
  },

  async listApplications(filters) {
    await settle()
    requireAdmin()
    const profileIds = filters.userId
      ? new Set(db.profiles.filter((profile) => profile.userId === filters.userId).map((profile) => profile.id))
      : null
    return db.applications
      .map(toAdminRecord)
      .filter((row): row is AdminApplicationRecord => row !== null)
      .filter((row) => (profileIds ? profileIds.has(row.profileId) : true))
      .filter((row) => matchesTracker(row, filters))
      .sort((a, b) => b.date.localeCompare(a.date))
  },

  async listProfiles(userId) {
    await settle()
    requireAdmin()
    requireAppUser(userId)
    return db.profiles
      .filter((profile) => profile.userId === userId)
      .map((profile) => ({ id: profile.id, name: profile.name }))
  },

  async listAiKeys() {
    await settle()
    requireAdmin()
    return db.aiKeys.map(publicKey)
  },

  async listAiUsage(keyId) {
    await settle()
    requireAdmin()
    return db.aiUsage
      .filter((event) => !keyId || event.keyId === keyId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((event) => ({ ...event }))
  },

  async createAiKey(input) {
    await settle()
    requireAdmin()
    const problem = validateNewAiKey(input)
    if (problem) throw new ApiError(problem)
    const provider = input.provider.trim()
    const key: StoredAiKey = {
      id: `key-${randomId().slice(0, 8)}`,
      name: input.name.trim(),
      provider,
      secret: input.secret.trim(),
      projectName: provider === "Google" ? input.projectName.trim() : "",
      projectNumber: provider === "Google" ? input.projectNumber.trim() : "",
      organizationId: provider === "OpenAI" ? input.organizationId.trim() : "",
      projectId: provider === "OpenAI" ? input.projectId.trim() : "",
      createdAt: new Date().toISOString(),
      revokedAt: null,
      tokensIn: 0,
      tokensOut: 0,
    }
    db.aiKeys.unshift(key)
    persist()
    return publicKey(key)
  },

  async testAiKey(keyId, message) {
    await settle()
    const admin = requireAdmin()
    const text = message.trim()
    if (!text) throw new ApiError("Enter a message.")
    const key = db.aiKeys.find((item) => item.id === keyId)
    if (!key) throw new ApiError("That API key could not be found.", 404)
    if (key.revokedAt) throw new ApiError("That API key is revoked.", 409)
    const name = admin.name.trim() || "there"
    return { reply: `Hello, ${name}. This is ${key.provider} AI. Nice to meet you.`, model: "mock" }
  },

  async revokeAiKey(keyId) {
    await settle()
    requireAdmin()
    const key = db.aiKeys.find((item) => item.id === keyId)
    if (!key) throw new ApiError("That API key could not be found.", 404)
    if (!key.revokedAt) key.revokedAt = new Date().toISOString()
    persist()
    return publicKey(key)
  },

  async listPrompts() {
    await settle()
    requireAdmin()
    return db.prompts.map((prompt) => ({ ...prompt }))
  },

  async updatePrompt(promptId, body) {
    await settle()
    requireAdmin()
    const prompt = db.prompts.find((item) => item.id === promptId)
    if (!prompt) throw new ApiError("That prompt could not be found.", 404)
    const next = body.trim()
    if (!next) throw new ApiError("Enter the prompt text.")
    prompt.body = next
    prompt.updatedAt = new Date().toISOString()
    persist()
    return { ...prompt } satisfies AiPrompt
  },
}
