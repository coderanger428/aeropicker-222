import { useEffect, useMemo, useState } from "react"
import { adminApi } from "../../api/admin/index.ts"
import { Button } from "../../components/ui/Button.tsx"
import { SelectField } from "../../components/ui/SelectField.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import type { AdminApplicationRecord, AdminProfileOption, AdminTrackerFilters, ManagedUser } from "../../domain/admin.ts"
import { STATUS_LABEL, formatDate, formatDateTime } from "../../domain/format.ts"
import type { ApplicationStatus } from "../../domain/types.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { useDebounced } from "../../lib/useDebounced.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

const STATUS_OPTIONS: { value: ApplicationStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "tailored", label: STATUS_LABEL.tailored },
  { value: "exported", label: STATUS_LABEL.exported },
  { value: "submitted", label: STATUS_LABEL.submitted },
  { value: "quit", label: STATUS_LABEL.quit },
]

export function AdminTrackerPage() {
  usePageTitle("Global tracker")
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [profiles, setProfiles] = useState<AdminProfileOption[]>([])
  const [userId, setUserId] = useState("")
  const [profileId, setProfileId] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [status, setStatus] = useState<ApplicationStatus | "">("")
  const [coverLetter, setCoverLetter] = useState<AdminTrackerFilters["coverLetter"]>("")
  const [handler, setHandler] = useState("")
  const [rows, setRows] = useState<AdminApplicationRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const companyQuery = useDebounced(company)
  const roleQuery = useDebounced(role)
  const handlerQuery = useDebounced(handler)
  const filters = useMemo<AdminTrackerFilters>(
    () => ({
      userId,
      profileId: userId ? profileId : "",
      company: companyQuery,
      role: roleQuery,
      status,
      coverLetter,
      handler: handlerQuery,
    }),
    [userId, profileId, companyQuery, roleQuery, status, coverLetter, handlerQuery],
  )

  useEffect(() => {
    let live = true
    adminApi.listUsers().then(
      (list) => {
        if (live) setUsers(list)
      },
      () => {
        if (live) setUsers([])
      },
    )
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setProfiles([])
      return
    }
    let live = true
    adminApi.listProfiles(userId).then(
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
  }, [userId])

  useEffect(() => {
    let live = true
    adminApi.listApplications(filters).then(
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

  function chooseUser(value: string) {
    setUserId(value)
    setProfileId("")
  }

  function clearFilters() {
    setUserId("")
    setProfileId("")
    setCompany("")
    setRole("")
    setStatus("")
    setCoverLetter("")
    setHandler("")
  }

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Application tracker</h1>
        </div>
      </header>
      <div className="filters">
        <SelectField
          label="User"
          value={userId}
          onChange={(event) => chooseUser(event.target.value)}
          options={[{ value: "", label: "All users" }, ...users.map((user) => ({ value: user.id, label: user.name }))]}
        />
        <SelectField
          label="Profile"
          value={userId ? profileId : ""}
          disabled={!userId}
          onChange={(event) => setProfileId(event.target.value)}
          options={
            userId
              ? [{ value: "", label: "All profiles" }, ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))]
              : [{ value: "", label: "Select a user first" }]
          }
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
          onChange={(event) => setCoverLetter(event.target.value as AdminTrackerFilters["coverLetter"])}
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
      {rows ? (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Id</th>
                <th>Date</th>
                <th>User</th>
                <th>Profile</th>
                <th>Company</th>
                <th>Role</th>
                <th>Job Link</th>
                <th>Resume</th>
                <th>Has Cover Letter</th>
                <th>Application Status</th>
                <th>Last Update</th>
                <th>Handler</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="empty-cell">
                    No applications match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.userName}</td>
                    <td>{row.profileName}</td>
                    <td>{row.company}</td>
                    <td>{row.role}</td>
                    <td className="link-cell">
                      {row.jobLink ? (
                        <a href={row.jobLink} target="_blank" rel="noreferrer">
                          {row.jobLink}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.resume}</td>
                    <td>{row.hasCoverLetter ? "Yes" : "No"}</td>
                    <td>
                      <span className={`pill pill-${row.status}`}>{STATUS_LABEL[row.status]}</span>
                    </td>
                    <td>{formatDateTime(row.lastUpdate)}</td>
                    <td>{row.handler}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
