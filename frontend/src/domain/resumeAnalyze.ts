import type { MasterResumeContent, ProfileDetails } from "./types.ts"

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
Convert the resume in <resume_text> to JSON. <profile_json> is the source of truth: use its value whenever a key is present. Personal info (name, phone, email, location, links) comes only from the profile, "" if absent.

Rules:
- If profile experience or education is non-empty, keep only the matching resume entries. If empty, take them from the resume.
- Everything else (headline, availability, summary, skills, titles, job locations, highlights) comes from the resume only. Don't invent; use "" or [] if missing.

Output one raw JSON object, no markdown or commentary:
{"name":"","headline":"","location":"","phone":"","email":"","availability":"","links":[{"label":"","url":""}],"summary":"","skills":[{"group":"","items":[""]}],"experience":[{"company":"","title":"","location":"","start":"","end":"","current":false,"highlights":[""]}],"education":[{"school":"","degree":"","start":"","end":""}]}
`.trim()

export interface ResumeAnalyzer {
  rules: string
  analyze(text: string, reference: ProfileResumeReference): MasterResumeContent
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

const STATIC_RESUME_CONTENT: MasterResumeContent = {
  name: "Static analysis",
  headline: "Demo parser result",
  location: "",
  phone: "",
  email: "",
  availability: "",
  links: [],
  summary:
    "Stand-in JSON from the analyzer interface. No model was called. Company names and work periods are reserved for the profile reference.",
  skills: [],
  experience: [
    {
      company: "Example Company",
      title: "Engineer",
      location: "",
      start: "Jan 2020",
      end: "",
      current: true,
      highlights: ["Replace this document when the model call is connected."],
    },
  ],
  education: [],
}

export const staticResumeAnalyzer: ResumeAnalyzer = {
  rules: RESUME_PARSE_RULES,
  analyze(text, reference) {
    void text
    void reference
    return structuredClone(STATIC_RESUME_CONTENT)
  },
}
