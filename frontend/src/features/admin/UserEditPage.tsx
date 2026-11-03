import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { adminApi } from "../../api/admin/index.ts"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import type { ManagedUser } from "../../domain/admin.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function UserEditPage() {
  const { userId = "" } = useParams()
  const navigate = useNavigate()
  usePageTitle("Edit user")
  const [user, setUser] = useState<ManagedUser | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let live = true
    adminApi.getUser(userId).then(
      (loaded) => {
        if (!live) return
        setUser(loaded)
        setName(loaded.name)
        setEmail(loaded.email)
      },
      (err: unknown) => {
        if (live) setError(errorMessage(err, "That user could not be loaded."))
      },
    )
    return () => {
      live = false
    }
  }, [userId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await adminApi.updateUser(userId, { name, email })
      navigate("/admin")
    } catch (err) {
      setError(errorMessage(err, "Could not save the user."))
      setPending(false)
    }
  }

  async function markDeleted(deleted: boolean) {
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const next = await adminApi.setDeleted(userId, deleted)
      setUser(next)
      setNotice(deleted ? "User marked deleted." : "Delete mark cleared.")
    } catch (err) {
      setError(errorMessage(err, "Could not update the delete mark."))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">User</p>
          <h1>{name || "Edit user"}</h1>
        </div>
        <div className="page-actions">
          <Link className="btn btn-secondary" to="/admin">
            Back to users
          </Link>
        </div>
      </header>
      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="info">{notice}</Banner> : null}
      {!user && !error ? <p className="loading">Loading user…</p> : null}
      {user ? (
        <form className="stack" onSubmit={(event) => void onSubmit(event)}>
          <p>
            {user.deletedAt ? <span className="mark">Deleted</span> : <span className="mark mark-ok">Active</span>}
            <span className="profile-stat"> {user.profileCount} profiles · {user.applicationCount} applications</span>
          </p>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <div className="page-actions">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save user"}
            </Button>
            {user.deletedAt ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => void markDeleted(false)}>
                Clear delete mark
              </Button>
            ) : (
              <Button type="button" variant="danger" disabled={pending} onClick={() => void markDeleted(true)}>
                Mark deleted
              </Button>
            )}
          </div>
        </form>
      ) : null}
    </section>
  )
}
