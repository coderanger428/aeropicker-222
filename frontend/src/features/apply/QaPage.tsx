import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../../api/index.ts"
import { StepBar } from "../../components/layout/StepBar.tsx"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { Dialog } from "../../components/ui/Dialog.tsx"
import { DownloadIcon } from "../../components/ui/icons.tsx"
import { TextArea } from "../../components/ui/TextArea.tsx"
import { splitQuestions } from "../../domain/questions.ts"
import type { ApplicationDetail, ExportedFile, QaPair } from "../../domain/types.ts"
import { downloadBlob } from "../../lib/download.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { useProfileOutlet } from "../profiles/profileContext.tsx"

export function QaPage() {
  usePageTitle("Application QA Assist")
  const { profile } = useProfileOutlet()
  const { applicationId = "" } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState<ApplicationDetail | null>(null)
  const [questions, setQuestions] = useState("")
  const [pairs, setPairs] = useState<QaPair[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [closing, setClosing] = useState<"finish" | "quit" | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const answersDirty = useRef(false)

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
        setPairs(app.qa)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not open application QA."))
      },
    )
    return () => {
      live = false
    }
  }, [applicationId, profile.id, navigate])

  async function draft() {
    if (!application) return
    const parsed = splitQuestions(questions)
    if (parsed.length === 0) {
      setError("Paste at least one question.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const answers = await api.askQa(application.id, parsed)
      answersDirty.current = false
      setPairs(answers)
    } catch (err) {
      setError(errorMessage(err, "Could not draft answers."))
    } finally {
      setPending(false)
    }
  }

  function updateAnswer(id: string, answer: string) {
    answersDirty.current = true
    setPairs((current) => current.map((pair) => (pair.id === id ? { ...pair, answer } : pair)))
  }

  useEffect(() => {
    if (!application || !answersDirty.current) return
    const timer = window.setTimeout(() => {
      answersDirty.current = false
      void api.saveQa(application.id, pairs).catch((err: unknown) => {
        answersDirty.current = true
        setError(errorMessage(err, "Could not save that answer."))
      })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [pairs, application])

  async function download(file: ExportedFile) {
    if (!application || downloading) return
    setDownloading(file.kind)
    setError(null)
    try {
      const blob = await api.downloadDocument(application.id, file.kind)
      downloadBlob(file.filename, blob)
      const next = await api.getApplication(application.id)
      setApplication(next)
    } catch (err) {
      setError(errorMessage(err, "Could not download that PDF."))
    } finally {
      setDownloading(null)
    }
  }

  async function finish() {
    if (!application) return
    setClosing("finish")
    setError(null)
    try {
      await api.finishApplication(application.id)
      navigate(`/profiles/${profile.id}/apply`)
    } catch (err) {
      setError(errorMessage(err, "Could not finish the application."))
      setClosing(null)
    }
  }

  async function quit() {
    if (!application) return
    setConfirmQuit(false)
    setClosing("quit")
    setError(null)
    try {
      await api.quitApplication(application.id)
      navigate(`/profiles/${profile.id}/apply`)
    } catch (err) {
      setError(errorMessage(err, "Could not quit the application."))
      setClosing(null)
    }
  }

  if (error && !application) {
    return (
      <section className="page">
        <Banner>{error}</Banner>
      </section>
    )
  }
  if (!application) return <p className="loading">Opening application QA…</p>

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            {application.company} · {application.jobTitle}
          </p>
          <h1>Application QA Assist</h1>
        </div>
      </header>
      <StepBar profileId={profile.id} step="qa" applicationId={application.id} qaEnabled />
      {error ? <Banner>{error}</Banner> : null}
      {application.files.length > 0 ? (
        <section className="doc-list">
          <h2>Documents</h2>
          <ul className="doc-files">
            {application.files.map((file) => (
              <li key={file.filename}>
                <span className="doc-name">{file.filename}</span>
                <Button
                  variant="secondary"
                  className="btn-icon"
                  aria-label={`Download ${file.filename}`}
                  disabled={downloading === file.kind}
                  onClick={() => void download(file)}
                >
                  <DownloadIcon />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="card stack">
        <TextArea
          label="Application questions"
          value={questions}
          onChange={(event) => setQuestions(event.target.value)}
        />
        <Button onClick={() => void draft()} disabled={pending}>
          {pending ? "Drafting…" : "Draft answers"}
        </Button>
      </div>
      {pairs.length > 0 ? (
        <div className="qa-list">
          {pairs.map((pair) => (
            <article key={pair.id} className="qa-item">
              <h3>{pair.question}</h3>
              <TextArea
                label="Answer"
                className="textarea-short"
                value={pair.answer}
                onChange={(event) => updateAnswer(pair.id, event.target.value)}
              />
            </article>
          ))}
        </div>
      ) : null}
      <div className="action-row">
        <Button variant="danger" onClick={() => setConfirmQuit(true)} disabled={closing !== null}>
          {closing === "quit" ? "Quitting…" : "Quit Application"}
        </Button>
        <Button onClick={() => void finish()} disabled={closing !== null}>
          {closing === "finish" ? "Finishing…" : "Finish Application"}
        </Button>
      </div>
      <Dialog open={confirmQuit} title="Quit this application?" onClose={() => setConfirmQuit(false)}>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => setConfirmQuit(false)}>
            Keep working
          </Button>
          <Button variant="danger" onClick={() => void quit()} disabled={closing === "quit"}>
            Quit Application
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
