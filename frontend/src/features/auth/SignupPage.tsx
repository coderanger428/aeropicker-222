import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../app/auth-context.ts"
import { AuthLayout } from "../../components/layout/AuthLayout.tsx"
import { Banner } from "../../components/ui/Banner.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { TextField } from "../../components/ui/TextField.tsx"
import { validateNewPassword } from "../../domain/validate.ts"
import { errorMessage } from "../../lib/errorMessage.ts"
import { usePageTitle } from "../../lib/usePageTitle.ts"

export function SignupPage() {
  usePageTitle("Create account")
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done && user) navigate("/", { replace: true })
  }, [done, user, navigate])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const problems = validateNewPassword(password, confirm)
    setPasswordError(problems.password ?? null)
    setConfirmError(problems.confirm ?? null)
    if (problems.password || problems.confirm) return
    setPending(true)
    setError(null)
    try {
      await signup({ name, email, password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, "Could not create the account."))
      setPending(false)
    }
  }

  return (
    <AuthLayout>
      <p className="eyebrow">Sign up</p>
      <h2>Create your desk</h2>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        {error ? <Banner>{error}</Banner> : null}
        <TextField
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          autoComplete="new-password"
          value={password}
          error={passwordError ?? undefined}
          onChange={(event) => {
            setPassword(event.target.value)
            setPasswordError(null)
          }}
          required
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={confirmError ?? undefined}
          onChange={(event) => {
            setConfirm(event.target.value)
            setConfirmError(null)
          }}
          required
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
