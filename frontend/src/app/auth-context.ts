import { createContext, useContext } from "react"
import type { User } from "../domain/types.ts"

export interface AuthValue {
  user: User | null
  ready: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  signup: (input: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider.")
  return value
}
