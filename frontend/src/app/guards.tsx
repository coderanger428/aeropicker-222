import type { ReactNode } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { FullPageStatus } from "../components/layout/FullPageStatus.tsx"
import { useAuth } from "./auth-context.ts"

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <FullPageStatus />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <FullPageStatus />
  if (user) return <Navigate to="/" replace />
  return children
}
