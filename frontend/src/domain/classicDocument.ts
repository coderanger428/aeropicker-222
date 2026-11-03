import { resumeContact } from "./resumeAnalyze.ts"
import type { ApplicationDetail, CoverLetterDocument, ExportedFile, MasterResumeContent, ProfileDetails } from "./types.ts"

export interface ClassicSkill {
  group: string
  items: string
}

export interface ClassicJob {
  company: string
  dates: string
  title: string
  location: string
  highlights: string[]
}

export interface ClassicSchool {
  school: string
  dates: string
  degree: string
}

export interface ClassicLink {
  url: string
  href: string
}

export interface ClassicResumeView {
  name: string
  headline: string
  contact: string
  availability: string
  links: ClassicLink[]
  detail: string
  summary: string
  skills: ClassicSkill[]
  experience: ClassicJob[]
  education: ClassicSchool[]
}

export interface ClassicLetterView {
  name: string
  contact: string[]
  date: string
  salutation: string
  paragraphs: string[]
  bullets: { label: string; text: string }[]
  closingLine: string
}

export function plainHeadline(value: string): string {
  const text = value.trim()
  if (text.length >= 2 && text.startsWith("[") && text.endsWith("]")) return text.slice(1, -1).trim()
  return text
}

export function classicResumeView(application: ApplicationDetail, details: ProfileDetails): ClassicResumeView {
  const master = application.tailorInput?.tailoredResume ?? application.tailorInput?.masterResume
  const view =
    master && (master.name || master.summary || master.experience.length > 0)
      ? fromMaster(master)
      : {
          name: "",
          headline: plainHeadline(application.resume.roleLine),
          contact: "",
          availability: "",
          links: [],
          detail: "",
          summary: application.resume.summary,
          skills: application.resume.skills.length ? [{ group: "Skills", items: application.resume.skills.join(", ") }] : [],
          experience: application.resume.experience.map((item) => ({
            company: item.org,
            dates: "",
            title: item.title,
            location: "",
            highlights: item.points,
          })),
          education: [],
        }
  return applyProfileHeader(view, details)
}

export function classicLetterView(
  application: ApplicationDetail,
  letter: CoverLetterDocument,
  details: ProfileDetails,
): ClassicLetterView {
  const reference = resumeContact(details)
  const contact = [reference.email, reference.phone, reference.location].filter(Boolean)
  const name = reference.name
  const closing = letter.closing.trim()
  const signature = letter.signature.trim()
  const closingLine = signature && !closing.includes(signature) ? `${closing} ${signature}`.trim() : closing
  return {
    name,
    contact,
    date: letterDate(application.createdAt),
    salutation: letter.salutation,
    paragraphs: letter.paragraphs.filter((paragraph) => paragraph.trim()),
    bullets: (letter.bullets ?? []).filter((bullet) => bullet.label.trim() || bullet.text.trim()),
    closingLine,
  }
}

export function documentFiles(application: {
  candidateName: string
  resumeLabel: string
  company: string
  jobTitle: string
  coverLetter: unknown
  tailorInput?: { masterResume: MasterResumeContent; tailoredResume?: MasterResumeContent | null } | null
}): ExportedFile[] {
  const master = application.tailorInput?.tailoredResume ?? application.tailorInput?.masterResume
  const name = master?.name || application.candidateName || "Resume"
  const headline = plainHeadline(master?.headline || "") || application.resumeLabel || "Resume"
  const files: ExportedFile[] = [
    {
      kind: "resume",
      filename: `${fileToken(name)}_${fileToken(headline)}.pdf`,
      title: "Resume",
      lines: [],
    },
  ]
  if (application.coverLetter) {
    files.push({
      kind: "cover-letter",
      filename: `${fileToken(name)}_${fileToken(application.jobTitle || "Role")}_${fileToken(application.company || "Company")}_Letter.pdf`,
      title: "Cover letter",
      lines: [],
    })
  }
  return files
}

function fromMaster(master: MasterResumeContent): ClassicResumeView {
  return {
    name: "",
    headline: plainHeadline(master.headline),
    contact: "",
    availability: master.availability.trim(),
    links: [],
    detail: "",
    summary: master.summary.trim(),
    skills: master.skills
      .map((group) => ({ group: group.group.trim() || "Skills", items: group.items.map((item) => item.trim()).filter(Boolean).join(", ") }))
      .filter((group) => group.items),
    experience: master.experience.map((job) => ({
      company: job.company.trim(),
      dates: dates(job.start, job.current ? "Present" : job.end),
      title: job.title.trim(),
      location: job.location.trim(),
      highlights: job.highlights.map((item) => item.trim()).filter(Boolean),
    })),
    education: master.education.map((school) => ({
      school: school.school.trim(),
      dates: dates(school.start, school.end),
      degree: school.degree.trim(),
    })),
  }
}

function applyProfileHeader(view: ClassicResumeView, details: ProfileDetails): ClassicResumeView {
  const reference = resumeContact(details)
  const links = reference.links.map((link) => ({ url: link.url, href: linkHref(link.url) }))
  return {
    ...view,
    name: reference.name,
    contact: pipes([reference.location, reference.phone, reference.email], true),
    links,
    detail: pipes([view.availability, ...links.map((link) => link.url)]),
  }
}

function linkHref(url: string): string {
  const text = url.trim()
  if (/^https?:\/\//i.test(text)) return text
  return `https://${text}`
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatPeriod(value: string): string {
  const text = value.trim()
  if (!text) return ""
  if (text.toLowerCase() === "present") return "Present"
  const match = /^(\d{4})-(\d{2})$/.exec(text)
  if (!match) return text
  const month = Number(match[2])
  if (month < 1 || month > 12) return text
  return `${MONTHS[month - 1]} ${match[1]}`
}

function pipes(parts: string[], trailing = false): string {
  const bits = parts.map((item) => item.trim()).filter(Boolean)
  if (bits.length === 0) return ""
  const text = bits.join(" | ")
  return trailing ? `${text} |` : text
}

function dates(start: string, end: string): string {
  return [formatPeriod(start), formatPeriod(end)].filter(Boolean).join(" - ")
}

function letterDate(iso: string): string {
  const moment = new Date(iso)
  if (Number.isNaN(moment.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(moment)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  const day = Number(value("day"))
  const teen = day % 100
  const suffix = teen >= 11 && teen <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] || "th"
  return `${day}${suffix} ${value("month")} ${value("year")}`
}

export function classicResumeLines(view: ClassicResumeView): string[] {
  const lines = [view.name, view.headline, view.contact, view.detail, ""]
  if (view.summary) lines.push("SUMMARY", view.summary, "")
  if (view.skills.length > 0) {
    lines.push("SKILLS")
    for (const group of view.skills) lines.push(`• ${group.group}: ${group.items}`)
    lines.push("")
  }
  if (view.experience.length > 0) {
    lines.push("PROFESSIONAL EXPERIENCE")
    for (const role of view.experience) {
      lines.push([role.company, role.dates].filter(Boolean).join(" "))
      lines.push([role.title, role.location].filter(Boolean).join(" "))
      for (const point of role.highlights) lines.push(`- ${point}`)
    }
    lines.push("")
  }
  if (view.education.length > 0) {
    lines.push("EDUCATION")
    for (const school of view.education) {
      lines.push([school.school, school.dates].filter(Boolean).join(" "))
      if (school.degree) lines.push(school.degree)
    }
  }
  return lines.filter((line) => line !== undefined)
}

export function classicLetterLines(view: ClassicLetterView): string[] {
  const lines = [view.name, view.contact.join(" | "), view.date, "", view.salutation, ""]
  for (const paragraph of view.paragraphs) lines.push(paragraph, "")
  for (const bullet of view.bullets) {
    const label = bullet.label ? (bullet.label.endsWith(":") ? bullet.label : `${bullet.label}:`) : ""
    lines.push(`- ${label} ${bullet.text}`.trim())
  }
  if (view.closingLine) lines.push("", view.closingLine)
  return lines.filter((line) => line !== undefined)
}

function fileToken(value: string): string {
  const parts = value.match(/[A-Za-z0-9]+/g) ?? []
  return parts.join("_").slice(0, 72) || "Document"
}
