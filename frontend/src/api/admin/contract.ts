import type {
  AdminAccount,
  AdminApplicationRecord,
  AdminProfileOption,
  AdminTrackerFilters,
  AiKey,
  AiPrompt,
  NewAiKeyInput,
  AiUsageEvent,
  ManagedUser,
  SearchResults,
  StatisticsReport,
} from "../../domain/admin.ts"

export interface AdminApi {
  login(input: { email: string; password: string }): Promise<{ token: string; user: AdminAccount }>
  logout(): Promise<void>
  me(): Promise<AdminAccount | null>

  listUsers(): Promise<ManagedUser[]>
  getUser(userId: string): Promise<ManagedUser>
  updateUser(userId: string, input: { name: string; email: string }): Promise<ManagedUser>
  setDeleted(userId: string, deleted: boolean): Promise<ManagedUser>

  search(query: string): Promise<SearchResults>
  statistics(period: "daily" | "weekly"): Promise<StatisticsReport>
  listApplications(filters: AdminTrackerFilters): Promise<AdminApplicationRecord[]>
  listProfiles(userId: string): Promise<AdminProfileOption[]>

  listAiKeys(): Promise<AiKey[]>
  listAiUsage(keyId?: string): Promise<AiUsageEvent[]>
  createAiKey(input: NewAiKeyInput): Promise<AiKey>
  testAiKey(keyId: string, message: string): Promise<{ reply: string; model: string }>
  revokeAiKey(keyId: string): Promise<AiKey>
  listPrompts(): Promise<AiPrompt[]>
  updatePrompt(promptId: string, body: string): Promise<AiPrompt>
}
