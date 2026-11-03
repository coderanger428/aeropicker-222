import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { adminApi } from "../../api/admin/index.ts"
import { Button } from "../../components/ui/Button.tsx"
import type { ManagedUser } from "../../domain/admin.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function UsersPage() {
  usePageTitle("Users")
  const navigate = useNavigate()
  const [users, setUsers] = useState<ManagedUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    adminApi.listUsers().then(
      (list) => {
        if (live) setUsers(list)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "Could not load users."))
      },
    )
    return () => {
      live = false
    }
  }, [])

  return (
    <section className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Users</h1>
        </div>
      </header>
      {error ? <p className="field-error">{error}</p> : null}
      {users === null && !error ? <p className="loading">Loading users…</p> : null}
      {users && users.length === 0 ? <p className="empty">No application users yet.</p> : null}
      {users && users.length > 0 ? (
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
                <th>Operation</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.profileCount}</td>
                  <td>{user.applicationCount}</td>
                  <td>{user.deletedAt ? <span className="mark">Deleted</span> : <span className="mark mark-ok">Active</span>}</td>
                  <td>
                    <Button variant="secondary" onClick={() => navigate(`/admin/users/${user.id}`)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
