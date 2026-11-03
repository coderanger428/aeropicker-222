import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { api } from "../../api/index.ts"
import { Button } from "../../components/ui/Button.tsx"
import { SelectField } from "../../components/ui/SelectField.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { STATUS_LABEL } from "../../domain/format.ts"
import type { ApplicationRecord, ApplicationStatus, Profile, TrackerFilters } from "../../domain/types.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { useDebounced } from "../../lib/useDebounced.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"
import { TrackerTable } from "./TrackerTable.tsx"

const STATUS_OPTIONS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "tailored", label: STATUS_LABEL.tailored },
  { value: "exported", label: STATUS_LABEL.exported },
  { value: "submitted", label: STATUS_LABEL.submitted },
  { value: "quit", label: STATUS_LABEL.quit },
]

export function TrackerPage() {
  usePageTitle("Application Tracker")
  const [searchParams, setSearchParams] = useSearchParams()
  const profileId = searchParams.get("profileId") ?? ""
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState<ApplicationStatus | "">("")
  const [coverLetter, setCoverLetter] = useState<TrackerFilters["coverLetter"]>("")
  const [handler, setHandler] = useState("")
  const [rows, setRows] = useState<ApplicationRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const companyQuery = useDebounced(company)
  const roleQuery = useDebounced(role)
  const handlerQuery = useDebounced(handler)
  const filters = useMemo<TrackerFilters>(
    () => ({
      profileId,
      company: companyQuery,
      role: roleQuery,
      status,
      coverLetter,
      handler: handlerQuery,
    }),
    [profileId, companyQuery, roleQuery, status, coverLetter, handlerQuery],
  )

  useEffect(() => {
    let live = true
    api.listProfiles().then(
      (list) => {
        if (live) setProfiles(list)
      },
      () => {
        if (live) setProfiles([])
      },
    )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    let live = true
    api.listApplications(filters).then(
      (list) => {
        if (!live) return
        setRows(list)
        setError(null)
      },
      (err: unknown) => {
        if (!live) return
        setError(errorMessage(err, "Could not load applications."))
      },
    )
    return () => {
      live = false
    }
  }, [filters])

  function setProfileId(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set("profileId", value)
    else next.delete("profileId")
    setSearchParams(next, { replace: true })
  }

  function clearFilters() {
    setCompany("")
    setRole("")
    setStatus("")
    setCoverLetter("")
    setHandler("")
    setProfileId("")
  }

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">History</p>
          <h1>Application Tracker</h1>
        </div>
      </header>
      <div className="filters">
        <SelectField
          label="Profile"
          value={profileId}
          onChange={(event) => setProfileId(event.target.value)}
          options={[{ value: "", label: "All profiles" }, ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))]}
        />
        <SelectField
          label="Application status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus | "")}
          options={STATUS_OPTIONS}
        />
        <SelectField
          label="Cover letter"
          value={coverLetter}
          onChange={(event) => setCoverLetter(event.target.value as TrackerFilters["coverLetter"])}
          options={[
            { value: "", label: "Any" },
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
        <TextField label="Company" value={company} onChange={(event) => setCompany(event.target.value)} />
        <TextField label="Role" value={role} onChange={(event) => setRole(event.target.value)} />
        <TextField label="Handler" value={handler} onChange={(event) => setHandler(event.target.value)} />
        <div className="filter-actions">
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <p className="result-count" aria-live="polite">
        {rows ? `${rows.length} ${rows.length === 1 ? "application" : "applications"}` : "Loading applications…"}
      </p>
      {rows ? <TrackerTable rows={rows} /> : null}
    </section>
  )
}
