import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../../api/index.ts"
import { StepBar } from "../../components/layout/StepBar.tsx"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { SelectField } from "../../components/ui/SelectField.tsx"
import { TextArea } from "../../components/ui/TextArea.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { hasRequiredResume, suggestRoleKey } from "../../domain/roles.ts"
import type { JobDraft, MasterResume } from "../../domain/types.ts"
import { validateJobLink } from "../../domain/validate.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { useProfileOutlet } from "../profiles/profileContext.tsx"

interface JobErrors {
  company?: string
  jobTitle?: string
  jobLink?: string
  jobDescription?: string
  baseResumeId?: string
}

export function JobPage() {
  usePageTitle("Tailor a resume")
  const { profile } = useProfileOutlet()
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<MasterResume[] | null>(null)
  const [draft, setDraft] = useState<JobDraft | null>(null)
  const [company, setCompany] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobLink, setJobLink] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [baseResumeId, setBaseResumeId] = useState("")
  const [baseTouched, setBaseTouched] = useState(false)
  const [errors, setErrors] = useState<JobErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([api.listResumes(profile.id), api.getDraft(profile.id)]).then(
      ([list, open]) => {
        if (!live) return
        if (!hasRequiredResume(list)) {
          navigate(`/profiles/${profile.id}/resumes`, { replace: true })
          return
        }
        setResumes(list)
        if (open) {
          setDraft(open)
          setCompany(open.company)
          setJobTitle(open.jobTitle)
          setJobLink(open.jobLink)
          setJobDescription(open.jobDescription)
          setBaseResumeId(open.baseResumeId)
          setBaseTouched(true)
        }
        setReady(true)
      },
      (err: unknown) => {
        if (live) setFormError(errorMessage(err, "Could not open this profile."))
      },
    )
    return () => {
      live = false
    }
  }, [profile.id, navigate])

  useEffect(() => {
    if (!resumes || baseTouched) return
    const roleKey = suggestRoleKey(jobTitle)
    const match =
      resumes.find((resume) => resume.roleKey === roleKey) ?? resumes.find((resume) => resume.roleKey === "full-stack")
    if (match) setBaseResumeId(match.id)
  }, [jobTitle, resumes, baseTouched])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: JobErrors = {}
    if (!company.trim()) nextErrors.company = "Enter the company."
    if (!jobTitle.trim()) nextErrors.jobTitle = "Enter the job title."
    if (!jobDescription.trim()) nextErrors.jobDescription = "Paste the job description."
    const linkError = validateJobLink(jobLink)
    if (linkError) nextErrors.jobLink = linkError
    if (!baseResumeId) nextErrors.baseResumeId = "Choose a master resume."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setPending(true)
    setFormError(null)
    setNotice(null)
    try {
      const result = await api.tailor(profile.id, {
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        jobLink: jobLink.trim(),
        jobDescription: jobDescription.trim(),
        generateCoverLetter: true,
        baseResumeId,
      })
      if (result.applicationId) {
        navigate(`/profiles/${profile.id}/apply/${result.applicationId}/preview`)
        return
      }
      setNotice(`Wrote the tailored PDF to ${result.file}.`)
    } catch (err) {
      setFormError(errorMessage(err, "Could not tailor a resume."))
    } finally {
      setPending(false)
    }
  }

  if (formError && !ready) {
    return (
      <section className="page">
        <Banner>{formError}</Banner>
      </section>
    )
  }
  if (!ready || !resumes) return <p className="loading">Loading job form…</p>

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{profile.name}</p>
          <h1>Tailor a resume</h1>
        </div>
        <Link className="text-link" to={`/profiles/${profile.id}/resumes`}>
          Update Master Resumes
        </Link>
      </header>
      <StepBar
        profileId={profile.id}
        step="job"
        applicationId={draft?.applicationId}
        qaEnabled={Boolean(draft)}
      />
      <form className="card stack" onSubmit={(event) => void onSubmit(event)}>
        {formError ? <Banner>{formError}</Banner> : null}
        {notice ? <Banner tone="info">{notice}</Banner> : null}
        <TextField
          label="Company"
          value={company}
          error={errors.company}
          onChange={(event) => setCompany(event.target.value)}
        />
        <TextField
          label="Job title"
          value={jobTitle}
          error={errors.jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
        />
        <TextField
          label="Job Link"
          type="url"
          inputMode="url"
          value={jobLink}
          error={errors.jobLink}
          onChange={(event) => setJobLink(event.target.value)}
        />
        <TextArea
          label="Job Description"
          value={jobDescription}
          error={errors.jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
        />
        <SelectField
          label="Base resume"
          value={baseResumeId}
          error={errors.baseResumeId}
          options={resumes.map((resume) => ({ value: resume.id, label: resume.roleLabel }))}
          onChange={(event) => {
            setBaseTouched(true)
            setBaseResumeId(event.target.value)
          }}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Tailoring…" : "Tailor resume & Write Cover letter"}
        </Button>
      </form>
    </section>
  )
}
