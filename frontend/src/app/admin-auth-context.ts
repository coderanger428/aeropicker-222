import { createContext, useContext } from "react"
import type { AdminAccount } from "../domain/admin.ts"

export interface AdminAuthValue {
  user: AdminAccount | null
  ready: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null)

export function useAdminAuth(): AdminAuthValue {
  const value = useContext(AdminAuthContext)
  if (!value) throw new Error("useAdminAuth must be used inside AdminAuthProvider.")
  return value
}
