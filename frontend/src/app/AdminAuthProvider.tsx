import { useEffect, useMemo, useState, type ReactNode } from "react"
import { adminApi } from "../api/admin/index.ts"
import type { AdminAccount } from "../domain/admin.ts"
import { AdminAuthContext, type AdminAuthValue } from "./admin-auth-context.ts"

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminAccount | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    adminApi.me().then(
      (current) => {
        if (!live) return
        setUser(current)
        setReady(true)
      },
      () => {
        if (!live) return
        setUser(null)
        setReady(true)
      },
    )
    const onUnauthorized = () => setUser(null)
    window.addEventListener("aeropicker:admin-unauthorized", onUnauthorized)
    return () => {
      live = false
      window.removeEventListener("aeropicker:admin-unauthorized", onUnauthorized)
    }
  }, [])

  const value = useMemo<AdminAuthValue>(
    () => ({
      user,
      ready,
      async login(input) {
        const session = await adminApi.login(input)
        setUser(session.user)
      },
      async logout() {
        await adminApi.logout()
        setUser(null)
      },
    }),
    [user, ready],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
