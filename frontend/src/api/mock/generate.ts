import type { CoverLetterDocument, ExportedFile, QaPair, ResumeDocument } from "../../domain/types.ts"
import { formatDate, slugify } from "../../domain/format.ts"
import { skillLabel } from "../../domain/keywords.ts"

export interface DraftContext {
  candidateName: string
  roleLabel: string
  company: string
  jobTitle: string
  keywords: string[]
}

function topic(keywords: readonly string[], index: number, fallback: string): string {
  return keywords[index] ?? fallback
}

export function buildResume(input: DraftContext): ResumeDocument {
  const first = topic(input.keywords, 0, "the core responsibilities")
  const second = topic(input.keywords, 1, "delivery")
  const third = topic(input.keywords, 2, "collaboration")
  const skills = input.keywords.length
    ? input.keywords.map(skillLabel)
    : ["Communication", "Delivery", "Problem solving"]

  return {
    candidateName: input.candidateName,
    roleLine: input.roleLabel,
    summary: `Hands-on ${input.roleLabel.toLowerCase()} applying ${first} and ${second} to production work. This draft is shaped for the ${input.jobTitle} role at ${input.company}.`,
    skills,
    experience: [
      {
        title: input.roleLabel,
        org: "Recent engagement",
        points: [
          `Led work around ${first}, aligning the implementation with what ${input.company} described for ${input.jobTitle}.`,
          `Broke ${second} into reviewable pieces and shipped them with the team.`,
          `Partnered with adjacent teams on ${third}, keeping the scope tied to the job description.`,
        ],
      },
      {
        title: "Software engineer",
        org: "Earlier experience",
        points: [
          `Built and maintained features where ${first} mattered to the people using them.`,
          "Left notes and handoffs clear enough for the next person to extend the work.",
        ],
      },
    ],
  }
}

export function buildCoverLetter(input: DraftContext): CoverLetterDocument {
  const first = topic(input.keywords, 0, "the work in the job description")
  const second = topic(input.keywords, 1, "shipping reliable software")
  return {
    subject: input.jobTitle,
    salutation: `Dear ${input.company} hiring team,`,
    paragraphs: [
      `I am applying for the ${input.jobTitle} role. The description lines up with the kind of work I want to keep doing, especially ${first}.`,
      `In recent roles I have taken ${input.roleLabel.toLowerCase()} work from a rough brief to something other people could run. A representative piece is the work around ${second}.`,
      `I would like to talk about how that experience can help ${input.company}. Thank you for reading.`,
    ],
    closing: "Sincerely,",
    signature: input.candidateName,
  }
}

export function draftAnswers(
  questions: readonly string[],
  input: Pick<DraftContext, "candidateName" | "company" | "jobTitle" | "keywords">,
): QaPair[] {
  const topicName = topic(input.keywords, 0, "the work described in the posting")
  return questions.map((question, index) => ({
    id: `qa-${index + 1}`,
    question,
    answer: `${input.candidateName} — for the ${input.jobTitle} role at ${input.company}: I would answer from specific work related to ${topicName}. ${directReply(question, input.company)}`,
  }))
}

function directReply(question: string, company: string): string {
  const normalized = question.toLowerCase()
  if (normalized.includes("year")) {
    return "I would state the years that match the requirement and name the project that best supports them."
  }
  if (normalized.includes("salary") || normalized.includes("compensation") || normalized.includes("pay")) {
    return "I would share a range after confirming the band for this role, and stay open on the rest of the package."
  }
  if (normalized.includes("sponsor") || normalized.includes("authoriz") || normalized.includes("visa")) {
    return "I would answer the work-authorization question directly for this profile."
  }
  if (normalized.includes("start") || normalized.includes("notice")) {
    return "I would give a realistic start date and the notice period I need."
  }
  if (normalized.includes("why")) {
    return `I would connect my interest to what ${company} is hiring for, using the language of the job description.`
  }
  return "I would answer in the first person, keep it specific, and mirror the terms used in the question."
}

export function buildExportFiles(input: {
  candidateName: string
  company: string
  jobTitle: string
  createdAt: string
  resume: ResumeDocument
  coverLetter: CoverLetterDocument | null
}): ExportedFile[] {
  const base = `${slugify(input.candidateName)}-${slugify(input.company)}-${slugify(input.jobTitle)}`
  const files: ExportedFile[] = [
    {
      kind: "resume",
      filename: `${base}-resume.pdf`,
      title: "Resume",
      lines: resumeLines(input.resume, input.company, input.jobTitle),
    },
  ]
  if (input.coverLetter) {
    files.push({
      kind: "cover-letter",
      filename: `${base}-cover-letter.pdf`,
      title: "Cover letter",
      lines: coverLetterLines(input.coverLetter, input.createdAt),
    })
  }
  return files
}

function resumeLines(resume: ResumeDocument, company: string, jobTitle: string): string[] {
  const lines = [
    resume.candidateName,
    resume.roleLine,
    `Prepared for ${jobTitle} at ${company}`,
    "",
    "Summary",
    resume.summary,
    "",
    "Skills",
    resume.skills.join(", "),
    "",
    "Experience",
  ]
  for (const block of resume.experience) {
    lines.push(block.title, block.org, ...block.points.map((point) => `- ${point}`), "")
  }
  return lines
}

function coverLetterLines(letter: CoverLetterDocument, createdAt: string): string[] {
  return [
    formatDate(createdAt),
    letter.signature,
    `Re: ${letter.subject}`,
    "",
    letter.salutation,
    "",
    ...letter.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    letter.closing,
    letter.signature,
  ]
}
