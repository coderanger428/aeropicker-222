import { Link } from "react-router-dom"
import type { MasterResume } from "../../domain/types.ts"
import { formatDate } from "../../domain/format.ts"
import { Button } from "../../components/ui/Button.tsx"
import { PdfPicker } from "../../components/ui/PdfPicker.tsx"
import { CheckIcon, DownloadIcon, RemoveIcon, SwapIcon, UploadIcon } from "../../components/ui/icons.tsx"

export function ResumeRoleRow({
  index,
  profileId,
  roleLabel,
  required,
  resume,
  pending,
  onUpload,
  onAnalyze,
  onDownload,
  onRemove,
}: {
  index: number
  profileId: string
  roleLabel: string
  required: boolean
  resume: MasterResume | null
  pending: boolean
  onUpload: (file: File) => void
  onAnalyze?: () => void
  onDownload?: () => void
  onRemove?: () => void
}) {
  const analyzed = Boolean(resume?.content)
  const applied = resume?.appliedCount ?? 0
  const appliedLabel = applied === 1 ? "1 job applied" : `${applied} jobs applied`

  return (
    <>
      <tr>
        <td>{index}</td>
        <td>
          {resume ? (
            <Link className="role-name" to={`/profiles/${profileId}/resumes/${resume.id}`}>
              {roleLabel}
            </Link>
          ) : (
            <span className="role-name">{roleLabel}</span>
          )}
          {required ? <span className="badge">Required</span> : <span className="badge badge-muted">Optional</span>}
        </td>
        <td>
          {resume ? (
            <>
              <div className="resume-file" title={resume.fileName}>
                {resume.fileName}
              </div>
              <div className="resume-sub">
                {formatDate(resume.uploadedAt)} · {appliedLabel}
              </div>
            </>
          ) : (
            <span className="resume-sub">No PDF yet</span>
          )}
        </td>
        <td>
          <div className="row-actions">
            <PdfPicker
              label={resume ? "Replace" : "Upload PDF"}
              icon={resume ? <SwapIcon /> : <UploadIcon />}
              className={resume ? "btn-swap" : "btn-upload"}
              disabled={pending}
              onPick={onUpload}
            />
            {resume && onDownload ? (
              <Button className="btn-icon btn-download" aria-label="Download" title="Download" onClick={onDownload} disabled={pending}>
                <DownloadIcon />
              </Button>
            ) : null}
            {resume && onRemove ? (
              <Button variant="danger" className="btn-icon" aria-label="Remove" title="Remove" onClick={onRemove} disabled={pending}>
                <RemoveIcon />
              </Button>
            ) : null}
            {resume && onAnalyze ? (
              <Button className={analyzed ? "btn-done" : undefined} variant="secondary" onClick={onAnalyze} disabled={pending || analyzed}>
                {analyzed ? (
                  <>
                    <CheckIcon /> Analyzed
                  </>
                ) : pending ? (
                  "Analyzing…"
                ) : (
                  "Analyze"
                )}
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
    </>
  )
}
