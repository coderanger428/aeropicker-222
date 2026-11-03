import type { ReactNode } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { FullPageStatus } from "../components/layout/FullPageStatus.tsx"
import { useAdminAuth } from "./admin-auth-context.ts"

export function RequireAdmin() {
  const { user, ready } = useAdminAuth()
  const location = useLocation()
  if (!ready) return <FullPageStatus />
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function AdminGuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAdminAuth()
  if (!ready) return <FullPageStatus />
  if (user) return <Navigate to="/admin" replace />
  return children
}
