import type { AdminApi } from "./contract.ts"
import { adminHttp } from "./http.ts"
import { adminMock } from "./mock.ts"

// Admin screens call this module only.
export const adminApi: AdminApi = import.meta.env.VITE_API_MODE === "http" ? adminHttp : adminMock
