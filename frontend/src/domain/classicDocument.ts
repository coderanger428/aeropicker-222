import { resumeContact } from "./resumeAnalyze.ts"
import type { ApplicationDetail, CoverLetterDocument, ExportedFile, MasterResumeContent, ProfileDetails, ResumeJson } from "./types.ts"

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

export interface ClassicSection {
  heading: string
  lines: string[]
}

export type ResumeNode =
  | { type: "section"; heading: string; children: ResumeNode[] }
  | { type: "entry"; children: ResumeNode[] }
  | { type: "bullets"; items: string[] }
  | { type: "field"; label: string; value: string }
  | { type: "text"; text: string }

export interface ClassicResumeView {
  name: string
  headline: string
  contact: string
  contactLines: string[]
  availability: string
  links: ClassicLink[]
  detail: string
  summary: string
  skills: ClassicSkill[]
  experience: ClassicJob[]
  education: ClassicSchool[]
  sections: ClassicSection[]
  nodes: ResumeNode[]
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
  const source = assembledResume(application)
  if (source && !isLegacyResume(source)) {
    const reference = resumeContact(details)
    const skip = new Set(
      [reference.name, reference.email, reference.phone, reference.location, ...reference.links.map((link) => link.url)]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    )
    return applyProfileHeader({ ...emptyResume(), nodes: resumeNodes(source, skip) }, details)
  }
  const master = source && isLegacyResume(source) ? source : null
  const view =
    master && (master.headline || master.summary || master.experience.length > 0 || (master.sections?.length ?? 0) > 0)
      ? fromMaster(master)
      : {
          name: "",
          headline: plainHeadline(application.resume.roleLine),
          contact: "",
          contactLines: [],
          availability: "",
          links: [],
          detail: "",
          sections: [],
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
          nodes: [],
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
  tailorInput?: { masterResume: ResumeJson; tailoredResume?: ResumeJson | null } | null
}): ExportedFile[] {
  const master = application.tailorInput?.masterResume ?? application.tailorInput?.tailoredResume
  const legacy = master && isLegacyResume(master) ? master : null
  const name = application.candidateName || legacy?.name || "Resume"
  const headline = plainHeadline(legacy?.headline || "") || application.resumeLabel || "Resume"
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
    contactLines: [],
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
    sections: (master.sections ?? [])
      .map((section) => ({
        heading: section.heading.trim(),
        lines: section.lines.map((line) => line.trim()).filter(Boolean),
      }))
      .filter((section) => section.heading || section.lines.length > 0),
    nodes: [],
  }
}

function emptyResume(): ClassicResumeView {
  return {
    name: "",
    headline: "",
    contact: "",
    contactLines: [],
    availability: "",
    links: [],
    detail: "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    sections: [],
    nodes: [],
  }
}

function assembledResume(application: ApplicationDetail): ResumeJson | null {
  const packet = application.tailorInput
  if (!packet?.masterResume && !packet?.tailoredResume) return null
  const master = packet.masterResume
  const tailored = packet.tailoredResume ?? null
  const legacyShape = isLegacyResume(master) || isLegacyResume(tailored) || packet.tailoredSummary != null || packet.tailoredExperience != null
  if (!legacyShape) return tailored ?? master
  const base = (isLegacyResume(master) ? master : tailored) as unknown as MasterResumeContent
  const origin = (isLegacyResume(master) ? master : base) as unknown as MasterResumeContent
  const previous = (isLegacyResume(tailored) ? tailored : null) as unknown as MasterResumeContent | null
  return {
    ...base,
    headline: origin.headline,
    availability: origin.availability,
    summary: packet.tailoredSummary ?? previous?.summary ?? base.summary,
    experience: packet.tailoredExperience ?? previous?.experience ?? base.experience,
    skills: origin.skills,
    education: origin.education,
    sections: origin.sections ?? [],
  }
}

export function isLegacyResume(content: unknown): content is MasterResumeContent {
  if (!content || typeof content !== "object") return false
  const record = content as Record<string, unknown>
  for (const key of ["name", "headline", "summary", "skills", "experience", "education"]) {
    if (!(key in record)) return false
  }
  if (!Array.isArray(record.skills) || !Array.isArray(record.experience)) return false
  if (record.skills.some((item) => !item || typeof item !== "object" || !("items" in item))) return false
  if (record.experience.some((item) => !item || typeof item !== "object" || !("company" in item) || !("highlights" in item))) return false
  return true
}

function resumeNodes(value: unknown, skip: Set<string>): ResumeNode[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return nodesFrom(value, skip)
  const nodes: ResumeNode[] = []
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const node = keyedNode(key, item, skip)
    if (node) nodes.push(node)
  }
  return nodes
}

function keyedNode(key: string, item: unknown, skip: Set<string>): ResumeNode | null {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    const children = resumeNodes(item, skip)
    return children.length ? { type: "section", heading: key, children } : null
  }
  if (Array.isArray(item)) {
    if (item.length > 0 && item.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry))) {
      const children = item
        .map((entry) => {
          const body = resumeNodes(entry, skip)
          return body.length ? ({ type: "entry", children: body } as ResumeNode) : null
        })
        .filter((entry): entry is ResumeNode => entry !== null)
      return children.length ? { type: "section", heading: key, children } : null
    }
    const children = listChildren(item, skip)
    return children.length ? { type: "section", heading: key, children } : null
  }
  const shown = showValue(item, skip)
  return shown ? { type: "field", label: key, value: shown } : null
}

function nodesFrom(value: unknown, skip: Set<string>): ResumeNode[] {
  if (Array.isArray(value)) return listChildren(value, skip)
  if (value && typeof value === "object") return resumeNodes(value, skip)
  const shown = showValue(value, skip)
  return shown ? [{ type: "text", text: shown }] : []
}

function listChildren(items: unknown[], skip: Set<string>): ResumeNode[] {
  const bullets: string[] = []
  const children: ResumeNode[] = []
  for (const item of items) {
    if (typeof item === "string") {
      const shown = showValue(item, skip)
      if (shown) bullets.push(shown)
    } else children.push(...nodesFrom(item, skip))
  }
  if (bullets.length) children.unshift({ type: "bullets", items: bullets })
  return children
}

function showValue(value: unknown, skip: Set<string>): string {
  if (typeof value === "boolean" || value == null) return ""
  if (typeof value === "number") return String(value)
  if (typeof value !== "string") return ""
  const text = value.trim()
  if (!text || skip.has(text.toLowerCase())) return ""
  if (text.toLowerCase() === "present") return "Present"
  return text.replace(/\b\d{4}-\d{2}\b/g, (token) => formatPeriod(token))
}

function applyProfileHeader(view: ClassicResumeView, details: ProfileDetails): ClassicResumeView {
  const reference = resumeContact(details)
  const links = reference.links.map((link) => ({ url: link.url, href: linkHref(link.url) }))
  return {
    ...view,
    name: reference.name,
    contact: pipes([reference.location, reference.phone, reference.email], true),
    contactLines: [reference.location, reference.phone, reference.email].filter(Boolean),
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
  for (const line of nodeLines(view.nodes)) lines.push(line)
  return lines.filter((line) => line !== undefined)
}

function nodeLines(nodes: ResumeNode[]): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    if (node.type === "section") {
      if (node.heading) lines.push(node.heading)
      lines.push(...nodeLines(node.children))
    } else if (node.type === "entry") {
      lines.push(...nodeLines(node.children), "")
    } else if (node.type === "bullets") {
      for (const item of node.items) lines.push(`- ${item}`)
    } else if (node.type === "field") {
      lines.push(`${node.label}: ${node.value}`)
    } else lines.push(node.text)
  }
  return lines
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
