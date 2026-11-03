import { useEffect, useMemo, useState, type ReactNode } from "react"
import { api } from "../api/index.ts"
import type { User } from "../domain/types.ts"
import { AuthContext, type AuthValue } from "./auth-context.ts"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    api.me().then(
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
    window.addEventListener("aeropicker:unauthorized", onUnauthorized)
    return () => {
      live = false
      window.removeEventListener("aeropicker:unauthorized", onUnauthorized)
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      async login(input) {
        const session = await api.login(input)
        setUser(session.user)
      },
      async signup(input) {
        const session = await api.signup(input)
        setUser(session.user)
      },
      async logout() {
        await api.logout()
        setUser(null)
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
