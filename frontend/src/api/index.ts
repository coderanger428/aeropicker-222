import type { UserApi } from "./contract.ts"
import { httpApi } from "./http/httpApi.ts"
import { mockApi } from "./mock/mockApi.ts"

// Screens call this module only.
// Set VITE_API_MODE=http to use the Python API instead of the in-browser mock.
export const api: UserApi = import.meta.env.VITE_API_MODE === "http" ? httpApi : mockApi
