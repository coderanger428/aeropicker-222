import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { useAdminAuth } from "../../app/admin-auth-context.ts"
import { BrandMark, ChartIcon, KeyIcon, PeopleIcon, SearchIcon, TrackerIcon } from "../ui/icons.tsx"
import { cx } from "../../lib/cx.ts"

export function AdminShell() {
  const { user, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (leaving && !user) navigate("/admin/login", { replace: true })
  }, [leaving, user, navigate])

  async function signOut() {
    await logout()
    setLeaving(true)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/admin" className="brand">
          <BrandMark />
          AeroPicker
        </Link>
        <p className="sidebar-kicker">Admin</p>
        <nav className="side-nav" aria-label="Admin">
          <NavLink to="/admin" end className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <PeopleIcon />
            Users
          </NavLink>
          <NavLink to="/admin/search" className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <SearchIcon />
            Global search
          </NavLink>
          <NavLink to="/admin/statistics" className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <ChartIcon />
            Statistics
          </NavLink>
          <NavLink to="/admin/tracker" className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <TrackerIcon />
            Application tracker
          </NavLink>
          <NavLink to="/admin/ai" className={({ isActive }) => cx("nav-link", isActive && "is-active")}>
            <KeyIcon />
            AI
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
