import { useEffect, useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAdminAuth } from "../../app/admin-auth-context.ts"
import { AuthLayout } from "../../components/layout/AuthLayout.tsx"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

function nextPath(state: unknown): string {
  if (typeof state !== "object" || state === null || !("from" in state)) return "/admin"
  const from = state.from
  if (typeof from !== "string" || !from.startsWith("/admin") || from.startsWith("/admin/login")) return "/admin"
  return from
}

export function AdminLoginPage() {
  usePageTitle("Admin sign in")
  const { user, login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const next = nextPath(location.state)
  const [email, setEmail] = useState("admin@aeropicker.dev")
  const [password, setPassword] = useState("admin")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done && user) navigate(next, { replace: true })
  }, [done, user, navigate, next])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await login({ email, password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, "Could not sign in."))
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <p className="eyebrow">Admin</p>
      <h2>Sign in</h2>
      <div className="callout">
        Demo admin <code>admin@aeropicker.dev</code> / <code>admin</code>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        {error ? <Banner>{error}</Banner> : null}
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  )
}
