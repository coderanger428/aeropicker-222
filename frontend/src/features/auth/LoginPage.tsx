import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../app/auth-context.ts"
import { AuthLayout } from "../../components/layout/AuthLayout.tsx"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { errorMessage } from "../../lib/errorMessage.ts"
import { safeNext } from "../../lib/safeNext.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function LoginPage() {
  usePageTitle("Sign in")
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const next = safeNext(location.state)
  const [email, setEmail] = useState("demo@aeropicker.dev")
  const [password, setPassword] = useState("demo")
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
      <p className="eyebrow">Sign in</p>
      <h2>Welcome back</h2>
      <div className="callout">
        Demo account <code>demo@aeropicker.dev</code> / <code>demo</code>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        {error ? <Banner>{error}</Banner> : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
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
      <p className="auth-switch">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
