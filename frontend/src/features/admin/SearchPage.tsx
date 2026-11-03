import { useEffect, useState } from "react"
import { adminApi } from "../../api/admin/index.ts"
import { TextField } from "../../components/ui/TextField.tsx"
import { formatDate } from "../../domain/format.ts"
import type { SearchResults } from "../../domain/admin.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { useDebounced } from "../../lib/useDebounced.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function SearchPage() {
  usePageTitle("Global search")
  const [query, setQuery] = useState("")
  const debounced = useDebounced(query)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const needle = debounced.trim()
    if (!needle) {
      setResults(null)
      setError(null)
      return
    }
    let live = true
    adminApi.search(needle).then(
      (found) => {
        if (!live) return
        setResults(found)
        setError(null)
      },
      (err: unknown) => {
        if (!live) return
        setError(errorMessage(err, "Search failed."))
      },
    )
    return () => {
      live = false
    }
  }, [debounced])

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Global search</h1>
        </div>
      </header>
      <TextField label="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
      {error ? <p className="field-error">{error}</p> : null}
      {results ? (
        <div className="stack">
          <h2>Users</h2>
          {results.users.length === 0 ? <p className="profile-stat">No users match.</p> : null}
          {results.users.length > 0 ? (
            <div className="table-scroll">
              <table className="data data-profiles">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Profiles</th>
                    <th>Applications</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.users.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.profileCount}</td>
                      <td>{user.applicationCount}</td>
                      <td>{user.deletedAt ? <span className="mark">Deleted</span> : <span className="mark mark-ok">Active</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <h2>Applications</h2>
          {results.applications.length === 0 ? <p className="profile-stat">No applications match.</p> : null}
          {results.applications.length > 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {results.applications.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.userName}</td>
                      <td>{row.profileName}</td>
                      <td>{row.company}</td>
                      <td>{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
