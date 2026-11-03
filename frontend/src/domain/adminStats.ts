import type { StatisticsReport } from "./admin.ts"

const DAILY_SPAN = 14
const WEEKLY_SPAN = 8

const ZONE = "Asia/Seoul"

const columnLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function seoulKey(date: Date): string {
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return dateKeyFromParts(value("year"), value("month"), value("day"))
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
}

function addDays(key: string, days: number): string {
  const date = parseKey(key)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function mondayKey(key: string): string {
  const date = parseKey(key)
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - weekday + 1)
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function labelFor(key: string): string {
  return columnLabel.format(parseKey(key))
}

export function statisticsReport(
  input: {
    users: { id: string; name: string; role: "user" | "admin"; deletedAt: string | null }[]
    profiles: { id: string; userId: string }[]
    applications: { profileId: string; createdAt: string }[]
  },
  period: "daily" | "weekly",
  now = new Date(),
): StatisticsReport {
  const today = seoulKey(now)
  const columns =
    period === "daily"
      ? Array.from({ length: DAILY_SPAN }, (_, index) => addDays(today, index - (DAILY_SPAN - 1)))
      : Array.from({ length: WEEKLY_SPAN }, (_, index) => addDays(mondayKey(today), (index - (WEEKLY_SPAN - 1)) * 7))

  const owner = new Map(input.profiles.map((profile) => [profile.id, profile.userId]))
  const buckets = new Map<string, Map<string, number>>()
  for (const application of input.applications) {
    const userId = owner.get(application.profileId)
    const day = seoulKey(new Date(application.createdAt))
    if (!userId || !day) continue
    const key = period === "daily" ? day : mondayKey(day)
    const row = buckets.get(userId) ?? new Map<string, number>()
    row.set(key, (row.get(key) ?? 0) + 1)
    buckets.set(userId, row)
  }

  const rows = input.users
    .filter((user) => user.role !== "admin")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((user) => {
      const counts = columns.map((key) => buckets.get(user.id)?.get(key) ?? 0)
      return {
        userId: user.id,
        userName: user.name,
        deleted: Boolean(user.deletedAt),
        counts,
        total: counts.reduce((sum, count) => sum + count, 0),
      }
    })

  return {
    period,
    columns: columns.map((key) => ({ key, label: period === "weekly" ? `Week of ${labelFor(key)}` : labelFor(key) })),
    rows,
  }
}
