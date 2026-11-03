import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "../../app/auth-context.ts"
import { BrandMark, PeopleIcon, TrackerIcon } from "../ui/icons.tsx"
import { cx } from "../../lib/cx.ts"

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (leaving && !user) navigate("/login", { replace: true })
  }, [leaving, user, navigate])

  async function signOut() {
    await logout()
    setLeaving(true)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <BrandMark />
          AeroPicker
        </Link>
        <nav className="side-nav" aria-label="Application">
          <NavLink to="/" end className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <PeopleIcon />
            Profiles
          </NavLink>
          <NavLink to="/tracker" className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <TrackerIcon />
            Application Tracker
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <p className="user-name">{user?.name}</p>
          <p className="user-email">{user?.email}</p>
          <button type="button" className="sign-out" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
