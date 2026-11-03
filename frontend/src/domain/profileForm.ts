import { randomId } from "../lib/randomId.ts"
import type {
  ProfileCertificate,
  ProfileDetails,
  ProfileEducation,
  ProfileExperience,
  ProfileLanguage,
  ProfileProject,
} from "./types.ts"

export const LANGUAGE_LEVELS: { value: ProfileLanguage["level"]; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "fluent", label: "Fluent" },
  { value: "natural", label: "Natural" },
]

export function newItemId(): string {
  return randomId()
}

export function emptyProject(): ProfileProject {
  return { id: newItemId(), title: "", description: "" }
}

export function emptyExperience(): ProfileExperience {
  return {
    id: newItemId(),
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    projects: [],
  }
}

export function emptyEducation(): ProfileEducation {
  return { id: newItemId(), school: "", location: "", startDate: "", endDate: "", degree: "" }
}

export function monthValue(value: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(value.trim())
  return match ? `${match[1]}-${match[2]}` : value.trim()
}

export function emptyCertificate(): ProfileCertificate {
  return { id: newItemId(), title: "", link: "", proofFileName: "", achievedDate: "" }
}

export function emptyLanguage(): ProfileLanguage {
  return { id: newItemId(), language: "", level: "" }
}

export function emptyDetails(fullName = ""): ProfileDetails {
  return {
    fullName,
    email: "",
    linkedin: "",
    address: "",
    phone: "",
    github: "",
    portfolio: "",
    x: "",
    facebook: "",
    includeLinkedin: true,
    includeAddress: true,
    includePhone: true,
    includeGithub: true,
    includePortfolio: true,
    includeX: true,
    includeFacebook: true,
    experience: [],
    education: [],
    certificates: [],
    languages: [],
  }
}

export function coerceDetails(details: Partial<ProfileDetails> | undefined, name: string): ProfileDetails {
  const base = emptyDetails(name)
  if (!details) return base
  return {
    ...base,
    ...details,
    fullName: details.fullName?.trim() ? details.fullName : name,
    experience: details.experience ?? [],
    education: details.education ?? [],
    certificates: details.certificates ?? [],
    languages: details.languages ?? [],
  }
}

function filled(value: string): boolean {
  return value.trim().length > 0
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function normalizeProfileDetails(details: ProfileDetails): ProfileDetails {
  const experience = details.experience.flatMap((item) => {
    const projects = item.projects.flatMap((project) => {
      const title = project.title.trim()
      const description = project.description.trim()
      if (!title && !description) return []
      return [{ ...project, title, description }]
    })
    const company = item.company.trim()
    const location = item.location.trim()
    const startDate = monthValue(item.startDate)
    const endDate = item.current ? "" : monthValue(item.endDate)
    const started = Boolean(company || location || startDate || endDate || item.current || projects.length > 0)
    if (!started) return []
    return [{ ...item, company, location, startDate, endDate, projects }]
  })

  const education = details.education.flatMap((item) => {
    const school = item.school.trim()
    const location = item.location.trim()
    const degree = item.degree.trim()
    const startDate = monthValue(item.startDate)
    const endDate = monthValue(item.endDate)
    if (!school && !location && !startDate && !endDate && !degree) return []
    return [{ ...item, school, location, startDate, endDate, degree }]
  })

  const certificates = details.certificates.flatMap((item) => {
    const title = item.title.trim()
    const link = item.link.trim()
    const proofFileName = item.proofFileName.trim()
    if (!title && !link && !proofFileName && !item.achievedDate) return []
    return [{ ...item, title, link, proofFileName }]
  })

  const languages = details.languages.flatMap((item) => {
    const language = item.language.trim()
    if (!language && !item.level) return []
    return [{ ...item, language }]
  })

  return {
    fullName: details.fullName.trim(),
    email: details.email.trim(),
    linkedin: details.linkedin.trim(),
    address: details.address.trim(),
    phone: details.phone.trim(),
    github: details.github.trim(),
    portfolio: details.portfolio.trim(),
    x: details.x.trim(),
    facebook: details.facebook.trim(),
    includeLinkedin: details.includeLinkedin !== false,
    includeAddress: details.includeAddress !== false,
    includePhone: details.includePhone !== false,
    includeGithub: details.includeGithub !== false,
    includePortfolio: details.includePortfolio !== false,
    includeX: details.includeX !== false,
    includeFacebook: details.includeFacebook !== false,
    experience,
    education,
    certificates,
    languages,
  }
}

export function profileCompleteness(details: ProfileDetails): number {
  const checks: boolean[] = [
    filled(details.fullName),
    filled(details.email),
    filled(details.linkedin),
    filled(details.address),
    filled(details.phone),
    filled(details.github),
    filled(details.portfolio),
    filled(details.x),
    filled(details.facebook),
  ]

  const experience = details.experience.length > 0 ? details.experience : [{ company: "", location: "", startDate: "", endDate: "", current: false, projects: [] }]
  for (const item of experience) {
    checks.push(filled(item.company), filled(item.location), filled(item.startDate), item.current || filled(item.endDate))
    const projects = item.projects.length > 0 ? item.projects : [{ title: "", description: "" }]
    for (const project of projects) checks.push(filled(project.title), filled(project.description))
  }

  const education = details.education.length > 0 ? details.education : [{ school: "", location: "", startDate: "", endDate: "", degree: "" }]
  for (const item of education) {
    checks.push(filled(item.school), filled(item.location), filled(item.startDate) && filled(item.endDate), filled(item.degree))
  }

  const certificates =
    details.certificates.length > 0 ? details.certificates : [{ title: "", link: "", proofFileName: "", achievedDate: "" }]
  for (const item of certificates) {
    checks.push(filled(item.title), filled(item.link), filled(item.proofFileName), filled(item.achievedDate))
  }

  const languages = details.languages.length > 0 ? details.languages : [{ language: "", level: "" }]
  for (const item of languages) checks.push(filled(item.language), filled(item.level))

  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

export function validateProfileDetails(details: ProfileDetails): string | null {
  if (!details.fullName.trim()) return "Enter the full name."
  if (details.fullName.trim().length > 80) return "Full name must be 80 characters or fewer."

  const personalStarted = [details.email, details.linkedin, details.address, details.phone, details.github, details.portfolio, details.x, details.facebook].some(filled)
  if (details.email.trim() && !validEmail(details.email.trim())) return "Personal details: enter a valid email."
  if (personalStarted) {
    if (!filled(details.email)) return "Personal details: enter an email."
    if (!filled(details.linkedin)) return "Personal details: enter a LinkedIn URL."
    if (!filled(details.address)) return "Personal details: enter an address."
    if (!filled(details.phone)) return "Personal details: enter a phone number."
  }

  for (const [index, item] of details.experience.entries()) {
    const where = `Experience ${index + 1}`
    if (!filled(item.company)) return `${where}: enter the company name.`
    if (!filled(item.location)) return `${where}: enter the location.`
    if (!filled(item.startDate)) return `${where}: enter the start of the work period.`
    if (!item.current && !filled(item.endDate)) return `${where}: enter the end of the work period, or mark currently working.`
    for (const [projectIndex, project] of item.projects.entries()) {
      const projectWhere = `${where}, project ${projectIndex + 1}`
      if (!filled(project.title)) return `${projectWhere}: enter the title.`
      if (!filled(project.description)) return `${projectWhere}: enter the description.`
    }
  }

  for (const [index, item] of details.education.entries()) {
    const where = `Education ${index + 1}`
    if (!filled(item.school)) return `${where}: enter the school name.`
    if (!filled(item.location)) return `${where}: enter the location.`
    if (!filled(item.startDate) || !filled(item.endDate)) return `${where}: enter the study period.`
    if (!filled(item.degree)) return `${where}: enter the degree.`
  }

  for (const [index, item] of details.certificates.entries()) {
    const where = `Certificate ${index + 1}`
    if (!filled(item.title)) return `${where}: enter the title.`
    if (!filled(item.link)) return `${where}: enter the link.`
    if (!filled(item.achievedDate)) return `${where}: enter the achieved date.`
  }

  for (const [index, item] of details.languages.entries()) {
    const where = `Language ${index + 1}`
    if (!filled(item.language)) return `${where}: enter the language.`
    if (!filled(item.level)) return `${where}: choose a level.`
  }

  return null
}
