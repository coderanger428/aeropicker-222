import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api } from "../../api/index.ts"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { UploadIcon } from "../../components/ui/icons.tsx"
import { hasRequiredResume, isPresetRole, PRESET_ROLES } from "../../domain/roles.ts"
import type { MasterResume } from "../../domain/types.ts"
import { downloadBlob } from "../../lib/download.ts"
import { randomId } from "../../lib/randomId.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { useProfileOutlet } from "../profiles/profileContext.tsx"
import { AddRoleDialog } from "./AddRoleDialog.tsx"
import { ResumeRoleRow } from "./ResumeRoleRow.tsx"

export function MasterResumesPage() {
  usePageTitle("Master resumes")
  const { profile } = useProfileOutlet()
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<MasterResume[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    let live = true
    api.listResumes(profile.id).then(
      (list) => {
        if (live) setResumes(list)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load master resumes."))
      },
    )
    return () => {
      live = false
    }
  }, [profile.id])

  function remember(saved: MasterResume) {
    setResumes((current) => {
      const next = (current ?? []).filter((resume) => resume.roleKey !== saved.roleKey)
      return [...next, saved]
    })
    setError(null)
  }

  async function upload(roleKey: string, roleLabel: string, file: File) {
    setPendingKey(roleKey)
    setError(null)
    try {
      const saved = await api.uploadResume(profile.id, { roleKey, roleLabel, file })
      remember(saved)
    } catch (err) {
      setError(errorMessage(err, "Could not upload that PDF."))
      throw err
    } finally {
      setPendingKey(null)
    }
  }

  async function analyze(resume: MasterResume) {
    setPendingKey(resume.roleKey)
    setError(null)
    try {
      const saved = await api.analyzeResume(profile.id, resume.id)
      remember(saved)
    } catch (err) {
      setError(errorMessage(err, "Could not analyze that PDF."))
    } finally {
      setPendingKey(null)
    }
  }

  async function download(resume: MasterResume) {
    setPendingKey(resume.roleKey)
    setError(null)
    try {
      const file = await api.downloadResume(profile.id, resume.id)
      downloadBlob(resume.fileName, file)
    } catch (err) {
      setError(errorMessage(err, "Could not download that PDF."))
    } finally {
      setPendingKey(null)
    }
  }

  async function remove(resume: MasterResume) {
    setPendingKey(resume.roleKey)
    setError(null)
    try {
      await api.removeResume(profile.id, resume.id)
      setResumes((current) => (current ?? []).filter((item) => item.id !== resume.id))
    } catch (err) {
      setError(errorMessage(err, "Could not remove that resume."))
    } finally {
      setPendingKey(null)
    }
  }

  const custom = (resumes ?? []).filter((resume) => !isPresetRole(resume.roleKey))
  const ready = resumes ? hasRequiredResume(resumes) : false

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{profile.name}</p>
          <h1>Master resumes</h1>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            <UploadIcon />
            Upload another role
          </Button>
          <Link className="text-link" to="/">
            All profiles
          </Link>
        </div>
      </header>
      {error ? <Banner>{error}</Banner> : null}
      {resumes === null && !error ? <p className="loading">Loading resumes…</p> : null}
      {resumes ? (
        <>
          <div className="table-scroll">
            <table className="data data-resumes">
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Role</th>
                  <th>Resume</th>
                  <th>Operation</th>
                </tr>
              </thead>
              <tbody>
                {PRESET_ROLES.map((role, index) => {
                  const resume = resumes.find((item) => item.roleKey === role.roleKey) ?? null
                  return (
                    <ResumeRoleRow
                      key={role.roleKey}
                      index={index + 1}
                      profileId={profile.id}
                      roleLabel={role.roleLabel}
                      required={role.required}
                      resume={resume}
                      pending={pendingKey === role.roleKey}
                      onUpload={(file) => {
                        void upload(role.roleKey, role.roleLabel, file).catch(() => undefined)
                      }}
                      onAnalyze={resume ? () => void analyze(resume) : undefined}
                      onDownload={resume ? () => void download(resume) : undefined}
                      onRemove={resume ? () => void remove(resume) : undefined}
                    />
                  )
                })}
                {custom.map((resume, index) => (
                  <ResumeRoleRow
                    key={resume.id}
                    index={PRESET_ROLES.length + index + 1}
                    profileId={profile.id}
                    roleLabel={resume.roleLabel}
                    required={false}
                    resume={resume}
                    pending={pendingKey === resume.roleKey}
                    onUpload={(file) => {
                      void upload(resume.roleKey, resume.roleLabel, file).catch(() => undefined)
                    }}
                    onAnalyze={() => void analyze(resume)}
                    onDownload={() => void download(resume)}
                    onRemove={() => void remove(resume)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="continue-bar">
            <p>
              {ready
                ? "Full Stack Engineer resume is on file."
                : "Upload a Full Stack Engineer resume to continue. The other slots are optional."}
            </p>
            <Button disabled={!ready} onClick={() => navigate(`/profiles/${profile.id}/apply`)}>
              Continue
            </Button>
          </div>
        </>
      ) : null}
      <AddRoleDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(roleLabel, file) => upload(`custom-${randomId()}`, roleLabel, file)}
      />
    </section>
  )
}
