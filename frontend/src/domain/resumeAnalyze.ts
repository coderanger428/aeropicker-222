import type { ProfileDetails, ResumeJson } from "./types.ts"

export interface ProfileResumeReference {
  name: string
  phone: string
  email: string
  location: string
  links: { label: string; url: string }[]
  experience: { company: string; start: string; end: string; current: boolean }[]
  education: { school: string; degree: string; start: string; end: string }[]
}

export const RESUME_PARSE_RULES = `
Convert the resume in <resume_text> into one JSON object.

Copy the document. Keep every section, heading, and field that is printed, in the order on the page. Use the printed headings and labels as the JSON keys. Nest a value when the page nests it. Use an array when the page repeats the same kind of entry. Copy the wording, dates, and numbers as written.

Do not rename anything into a standard resume format. Do not drop a section. Do not invent a field. Do not summarize or rewrite.

Output one raw JSON object and no markdown.
`.trim()

export interface ResumeAnalyzer {
  rules: string
  analyze(text: string): ResumeJson
}

function included(value: boolean | undefined): boolean {
  return value !== false
}

/** Printed resume header. Name and email always show. The other contacts follow their checkboxes. */
export function resumeContact(details: ProfileDetails): Pick<ProfileResumeReference, "name" | "phone" | "email" | "location" | "links"> {
  const links = (
    [
      ["LinkedIn", details.linkedin, details.includeLinkedin],
      ["GitHub", details.github, details.includeGithub],
      ["Portfolio", details.portfolio, details.includePortfolio],
      ["X", details.x, details.includeX],
      ["Facebook", details.facebook, details.includeFacebook],
    ] as const
  ).flatMap(([label, url, show]) => {
    const text = url.trim()
    if (!text || !included(show)) return []
    return [{ label, url: text }]
  })
  return {
    name: details.fullName.trim(),
    phone: included(details.includePhone) ? details.phone.trim() : "",
    email: details.email.trim(),
    location: included(details.includeAddress) ? details.address.trim() : "",
    links,
  }
}

export function profileResumeReference(details: ProfileDetails): ProfileResumeReference {
  const links = (
    [
      ["LinkedIn", details.linkedin],
      ["GitHub", details.github],
      ["Portfolio", details.portfolio],
      ["X", details.x],
      ["Facebook", details.facebook],
    ] as const
  )
    .map(([label, url]) => ({ label, url: url.trim() }))
    .filter((link) => link.url)
  return {
    name: details.fullName.trim(),
    phone: details.phone.trim(),
    email: details.email.trim(),
    location: details.address.trim(),
    links,
    experience: details.experience
      .filter((item) => item.company.trim() || item.startDate || item.endDate || item.current)
      .map((item) => ({
        company: item.company.trim(),
        start: item.startDate,
        end: item.current ? "" : item.endDate,
        current: item.current,
      })),
    education: details.education
      .filter((item) => item.school.trim() || item.degree.trim() || item.startDate || item.endDate)
      .map((item) => ({
        school: item.school.trim(),
        degree: item.degree.trim(),
        start: item.startDate,
        end: item.endDate,
      })),
  }
}

const STATIC_RESUME_CONTENT: ResumeJson = {
  Notice: "Stand-in JSON from the analyzer interface. No model was called.",
}

export const staticResumeAnalyzer: ResumeAnalyzer = {
  rules: RESUME_PARSE_RULES,
  analyze(text) {
    void text
    return structuredClone(STATIC_RESUME_CONTENT)
  },
}
