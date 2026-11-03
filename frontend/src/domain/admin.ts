import type { ApplicationRecord, TrackerFilters } from "./types.ts"

export interface AdminAccount {
  id: string
  name: string
  email: string
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  profileCount: number
  applicationCount: number
  deletedAt: string | null
}

export interface AdminProfileOption {
  id: string
  name: string
}

export interface AdminApplicationRecord extends ApplicationRecord {
  userId: string
  userName: string
}

export interface AdminTrackerFilters extends TrackerFilters {
  userId: string
}

export interface SearchResults {
  users: ManagedUser[]
  applications: AdminApplicationRecord[]
}

export interface StatisticsColumn {
  key: string
  label: string
}

export interface StatisticsRow {
  userId: string
  userName: string
  deleted: boolean
  counts: number[]
  total: number
}

export interface StatisticsReport {
  period: "daily" | "weekly"
  columns: StatisticsColumn[]
  rows: StatisticsRow[]
}

export interface AiKey {
  id: string
  name: string
  provider: string
  lastFour: string
  projectName: string
  projectNumber: string
  organizationId: string
  projectId: string
  createdAt: string
  revokedAt: string | null
  tokensIn: number
  tokensOut: number
}

export interface NewAiKeyInput {
  name: string
  provider: string
  secret: string
  projectName: string
  projectNumber: string
  organizationId: string
  projectId: string
}

export function validateNewAiKey(input: NewAiKeyInput): string | null {
  const provider = input.provider.trim()
  if (!provider) return "Choose a provider."
  if (!(AI_PROVIDERS as readonly string[]).includes(provider)) return "Choose a provider."
  if (!input.name.trim()) return "Enter a name for the key."
  if (input.secret.trim().length < 8) return "Enter an API key of at least 8 characters."
  if (provider === "Google") {
    if (!input.projectName.trim()) return "Enter the Google Cloud project name."
    if (!input.projectNumber.trim()) return "Enter the Google Cloud project number."
  }
  if (provider === "OpenAI") {
    if (!input.organizationId.trim()) return "Enter the OpenAI organization ID."
    if (!input.projectId.trim()) return "Enter the OpenAI project ID."
  }
  return null
}

export function aiKeyDetail(key: Pick<AiKey, "provider" | "projectName" | "projectNumber" | "organizationId" | "projectId">): string {
  if (key.provider === "Google") return [key.projectName, key.projectNumber].filter(Boolean).join(" · ")
  if (key.provider === "OpenAI") return [key.organizationId, key.projectId].filter(Boolean).join(" · ")
  return ""
}

export interface AiUsageEvent {
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

export interface AiPrompt {
  id: string
  name: string
  purpose: string
  body: string
  updatedAt: string
}

export const AI_PROVIDERS = ["OpenAI", "Anthropic", "Google"] as const
