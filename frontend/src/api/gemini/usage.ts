import { randomId } from "../../lib/randomId.ts"
import { db, saveDb } from "../mock/db.ts"

const MAX_EVENTS = 200

export interface GeminiUsage {
  model: string
  purpose: string
  promptTokens: number
  outputTokens: number
  thoughtTokens?: number
  keyId?: string
}

// Records tokens from a Gemini response. Google does not publish a usage history for an API key.
export function recordGeminiUsage(usage: GeminiUsage): void {
  const key =
    db.aiKeys.find((item) => item.id === usage.keyId && !item.revokedAt) ??
    db.aiKeys.find((item) => item.provider === "Google" && !item.revokedAt)
  if (!key) return
  const promptTokens = Math.max(0, Math.floor(usage.promptTokens))
  const outputTokens = Math.max(0, Math.floor(usage.outputTokens))
  const thoughtTokens = Math.max(0, Math.floor(usage.thoughtTokens ?? 0))
  if (!Array.isArray(db.aiUsage)) db.aiUsage = []
  db.aiUsage.unshift({
    id: `use-${randomId().slice(0, 8)}`,
    keyId: key.id,
    at: new Date().toISOString(),
    model: usage.model,
    purpose: usage.purpose,
    promptTokens,
    outputTokens,
    thoughtTokens,
    totalTokens: promptTokens + outputTokens + thoughtTokens,
  })
  db.aiUsage.splice(MAX_EVENTS)
  key.tokensIn += promptTokens
  key.tokensOut += outputTokens + thoughtTokens
  saveDb(db)
}
