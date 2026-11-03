import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../../api/index.ts"
import { StepBar } from "../../components/layout/StepBar.tsx"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { SelectField } from "../../components/ui/SelectField.tsx"
import { classicLetterView, classicResumeView } from "../../domain/classicDocument.ts"
import { DOCUMENT_TEMPLATES, type DocumentTemplate } from "../../domain/templates.ts"
import type { ApplicationDetail } from "../../domain/types.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { useProfileOutlet } from "../profiles/profileContext.tsx"
import { ClassicLetter } from "./ClassicLetter.tsx"
import { ClassicResume } from "./ClassicResume.tsx"

export function PreviewPage() {
  usePageTitle("Tailored preview")
  const { profile } = useProfileOutlet()
  const { applicationId = "" } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState<ApplicationDetail | null>(null)
  const [templates, setTemplates] = useState<readonly DocumentTemplate[]>(DOCUMENT_TEMPLATES)
  const [templateId, setTemplateId] = useState("classic")
  const [error, setError] = useState<string | null>(null)
  const [pane, setPane] = useState<"resume" | "cover">("resume")

  useEffect(() => {
    let live = true
    api.listTemplates().then(
      (items) => {
        if (live && items.length > 0) setTemplates(items)
      },
      () => {
        // The page still offers Classic when the catalog request fails.
      },
    )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    let live = true
    api.getApplication(applicationId).then(
      (app) => {
        if (!live) return
        if (app.profileId !== profile.id || !app.open) {
          navigate(`/profiles/${profile.id}/apply`, { replace: true })
          return
        }
        setApplication(app)
        setTemplateId(app.templateId || "classic")
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load the preview."))
      },
    )
    return () => {
      live = false
    }
  }, [applicationId, profile.id, navigate])

  async function onTemplate(next: string) {
    if (!application || next === templateId) return
    const previous = templateId
    setTemplateId(next)
    setError(null)
    try {
      const saved = await api.setTemplate(application.id, next)
      setApplication(saved)
      setTemplateId(saved.templateId || next)
    } catch (err) {
      setTemplateId(previous)
      setError(errorMessage(err, "Could not save that template."))
    }
  }

  if (error && !application) {
    return (
      <section className="page">
        <Banner>{error}</Banner>
      </section>
    )
  }
  if (!application) return <p className="loading">Preparing the preview…</p>

  const choices = templates.some((item) => item.id === templateId)
    ? templates
    : [...templates, { id: templateId, label: templateId }]
  const resume = classicResumeView(application, profile.details)
  const letter = application.coverLetter ? classicLetterView(application, application.coverLetter, profile.details) : null

  return (
    <section className="page page-preview">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            {application.company} · {application.jobTitle}
          </p>
          <h1>Tailored preview</h1>
        </div>
      </header>
      <StepBar profileId={profile.id} step="preview" applicationId={application.id} qaEnabled />
      {error ? <Banner>{error}</Banner> : null}
      <SelectField
        className="template-field"
        label="Template"
        value={templateId}
        options={choices.map((item) => ({ value: item.id, label: item.label }))}
        onChange={(event) => void onTemplate(event.target.value)}
      />
      <div className="preview-switch" role="tablist" aria-label="Document preview">
        <button type="button" role="tab" aria-selected={pane === "resume"} onClick={() => setPane("resume")}>
          Resume
        </button>
        {letter ? (
          <button type="button" role="tab" aria-selected={pane === "cover"} onClick={() => setPane("cover")}>
            Cover letter
          </button>
        ) : null}
      </div>
      {pane === "cover" && letter ? <ClassicLetter view={letter} /> : <ClassicResume view={resume} />}
      <div className="continue-bar continue-bar-end">
        <Button onClick={() => navigate(`/profiles/${profile.id}/apply/${application.id}/qa`)}>Continue</Button>
      </div>
    </section>
  )
}
