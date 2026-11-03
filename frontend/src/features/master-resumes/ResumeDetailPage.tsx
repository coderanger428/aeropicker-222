import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../../api/index.ts"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { formatDate } from "../../domain/format.ts"
import type { MasterResume } from "../../domain/types.ts"
import { downloadBlob } from "../../lib/download.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { useProfileOutlet } from "../profiles/profileContext.tsx"

export function ResumeDetailPage() {
  const { profile } = useProfileOutlet()
  const { resumeId } = useParams()
  const [resume, setResume] = useState<MasterResume | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  usePageTitle(resume ? resume.roleLabel : "Master resume")

  useEffect(() => {
    if (!resumeId) return
    let live = true
    setResume(null)
    setError(null)
    api.listResumes(profile.id).then(
      (list) => {
        if (!live) return
        const found = list.find((item) => item.id === resumeId) ?? null
        if (!found) setError("That resume is no longer on this profile.")
        else setResume(found)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load that resume."))
      },
    )
    return () => {
      live = false
    }
  }, [profile.id, resumeId])

  async function download() {
    if (!resume) return
    setPending(true)
    setError(null)
    try {
      const file = await api.downloadResume(profile.id, resume.id)
      downloadBlob(resume.fileName, file)
    } catch (err) {
      setError(errorMessage(err, "Could not download that PDF."))
    } finally {
      setPending(false)
    }
  }

  const json = resume?.content ? JSON.stringify(resume.content, null, 2) : ""

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{profile.name}</p>
          <h1>{resume?.roleLabel ?? "Master resume"}</h1>
        </div>
        <Link className="text-link" to={`/profiles/${profile.id}/resumes`}>
          All master resumes
        </Link>
      </header>
      {error ? <Banner>{error}</Banner> : null}
      {!resume && !error ? <p className="loading">Loading resume…</p> : null}
      {resume ? (
        <div className="stack">
          <dl className="resume-facts">
            <div>
              <dt>File</dt>
              <dd>{resume.fileName}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDate(resume.uploadedAt)}</dd>
            </div>
          </dl>
          <div className="page-actions">
            <Button onClick={() => void download()} disabled={pending}>
              Download
            </Button>
          </div>
          {json ? (
            <pre className="json-block">{json}</pre>
          ) : (
            <p className="resume-sub">Not analyzed yet.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
