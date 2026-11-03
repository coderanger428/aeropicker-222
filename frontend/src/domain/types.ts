export type ApplicationStatus = "tailored" | "exported" | "submitted" | "quit"

export interface User {
  id: string
  name: string
  email: string
}

export interface Session {
  token: string
  user: User
}

export type LanguageLevel = "beginner" | "intermediate" | "advanced" | "fluent" | "natural"

export interface ProfileProject {
  id: string
  title: string
  description: string
}

export interface ProfileExperience {
  id: string
  company: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  projects: ProfileProject[]
}

export interface ProfileEducation {
  id: string
  school: string
  location: string
  startDate: string
  endDate: string
  degree: string
}

export interface ProfileCertificate {
  id: string
  title: string
  link: string
  proofFileName: string
  achievedDate: string
}

export interface ProfileLanguage {
  id: string
  language: string
  level: LanguageLevel | ""
}

export interface ProfileDetails {
  fullName: string
  email: string
  linkedin: string
  address: string
  phone: string
  github: string
  portfolio: string
  x: string
  facebook: string
  includeLinkedin: boolean
  includeAddress: boolean
  includePhone: boolean
  includeGithub: boolean
  includePortfolio: boolean
  includeX: boolean
  includeFacebook: boolean
  experience: ProfileExperience[]
  education: ProfileEducation[]
  certificates: ProfileCertificate[]
  languages: ProfileLanguage[]
}

export interface Profile {
  id: string
  name: string
  headline: string
  createdAt: string
  resumeCount: number
  applicationCount: number
  hasRequiredResume: boolean
  details: ProfileDetails
}

export type ResumeJson = Record<string, unknown>

export interface MasterResumeContent {
  name: string
  headline: string
  location: string
  phone: string
  email: string
  availability: string
  links: { label: string; url: string }[]
  summary: string
  skills: { group: string; items: string[] }[]
  experience: {
    company: string
    title: string
    location: string
    start: string
    end: string
    current: boolean
    highlights: string[]
  }[]
  education: { school: string; degree: string; start: string; end: string }[]
  sections?: { heading: string; lines: string[] }[]
}

export interface MasterResume {
  id: string
  profileId: string
  roleKey: string
  roleLabel: string
  fileName: string
  uploadedAt: string
  characterCount: number
  excerpt: string
  appliedCount: number
  content: ResumeJson | null
}

export interface ExperienceBlock {
  title: string
  org: string
  points: string[]
}

export interface ResumeDocument {
  candidateName: string
  roleLine: string
  summary: string
  skills: string[]
  experience: ExperienceBlock[]
}

export interface CoverLetterBullet {
  label: string
  text: string
}

export interface CoverLetterDocument {
  subject: string
  salutation: string
  paragraphs: string[]
  bullets?: CoverLetterBullet[]
  closing: string
  signature: string
}

export interface QaPair {
  id: string
  question: string
  answer: string
}

export interface ExportedFile {
  kind: "resume" | "cover-letter"
  filename: string
  title: string
  lines: string[]
}

export interface ParsedJob {
  keySkills: string[]
  prefSkills: string[]
  reusePhrases: string[]
}

export interface JobAnalysis {
  file: string
  applicationId: string
}

export interface TailorPacket {
  masterResume: ResumeJson
  job: ParsedJob
  tailoredResume?: ResumeJson | null
  tailoredSummary?: string | null
  tailoredExperience?: MasterResumeContent["experience"] | null
}

export interface JobDraft {
  applicationId: string
  status: "tailored" | "exported"
  company: string
  jobTitle: string
  jobLink: string
  jobDescription: string
  generateCoverLetter: boolean
  baseResumeId: string
}

export interface TailorInput {
  company: string
  jobTitle: string
  jobLink: string
  jobDescription: string
  generateCoverLetter: boolean
  baseResumeId: string
}

export interface ApplicationDetail {
  id: string
  profileId: string
  profileName: string
  company: string
  jobTitle: string
  jobLink: string
  jobDescription: string
  generateCoverLetter: boolean
  baseResumeId: string
  resumeLabel: string
  candidateName: string
  status: ApplicationStatus
  open: boolean
  createdAt: string
  updatedAt: string
  handler: string
  templateId: string
  tailorInput: TailorPacket | null
  resume: ResumeDocument
  coverLetter: CoverLetterDocument | null
  qa: QaPair[]
  files: ExportedFile[]
}

export interface ApplicationRecord {
  id: string
  date: string
  profileId: string
  profileName: string
  company: string
  role: string
  jobLink: string
  resume: string
  hasCoverLetter: boolean
  status: ApplicationStatus
  lastUpdate: string
  handler: string
}

export interface TrackerFilters {
  profileId: string
  company: string
  role: string
  status: ApplicationStatus | ""
  coverLetter: "yes" | "no" | ""
  handler: string
}

export interface UploadResumeInput {
  roleKey: string
  roleLabel: string
  file: File
}
