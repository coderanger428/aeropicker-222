import type { ApplicationStatus } from "./types.ts"

const ZONE = "Asia/Seoul"

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: ZONE,
})

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: ZONE,
})

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return dateFormat.format(date)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return dateTimeFormat.format(date)
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  tailored: "Tailored",
  exported: "Exported",
  submitted: "Submitted",
  quit: "Quit",
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug.slice(0, 48) || "document"
}
