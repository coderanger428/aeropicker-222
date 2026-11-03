import { useEffect, useState, type FormEvent } from "react"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { UploadIcon } from "../../components/ui/icons.tsx"
import { Dialog } from "../../components/ui/Dialog.tsx"
import { PdfPicker } from "../../components/ui/PdfPicker.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { errorMessage } from "../../lib/errorMessage.ts"

export function AddRoleDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (roleLabel: string, file: File) => Promise<void>
}) {
  const [roleLabel, setRoleLabel] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) return
    setRoleLabel("")
    setFile(null)
    setError(null)
    setPending(false)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError("Choose a PDF.")
      return
    }
    setPending(true)
    setError(null)
    try {
      await onAdd(roleLabel, file)
      onClose()
    } catch (err) {
      setError(errorMessage(err, "Could not add that resume."))
      setPending(false)
    }
  }

  return (
    <Dialog open={open} title="Add a resume slot" onClose={() => (pending ? undefined : onClose())}>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        {error ? <Banner>{error}</Banner> : null}
        <TextField
          label="Role name"
          value={roleLabel}
          onChange={(event) => setRoleLabel(event.target.value)}
          autoFocus
          required
        />
        <div className="field">
          <span className="field-label">PDF</span>
          <PdfPicker label={file ? "Replace PDF" : "Choose PDF"} disabled={pending} onPick={setFile} />
          {file ? <p className="field-hint">{file.name}</p> : null}
        </div>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !file}>
            {pending ? "Uploading…" : <><UploadIcon /> Upload</>}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
