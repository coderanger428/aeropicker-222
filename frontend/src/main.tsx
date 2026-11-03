import { config } from "@fortawesome/fontawesome-svg-core"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { AdminAuthProvider } from "./app/AdminAuthProvider.tsx"
import { AuthProvider } from "./app/AuthProvider.tsx"
import { router } from "./app/router.tsx"
import "@fortawesome/fontawesome-svg-core/styles.css"
import "./styles/app.css"

config.autoAddCss = false

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AdminAuthProvider>
        <RouterProvider router={router} />
      </AdminAuthProvider>
    </AuthProvider>
  </StrictMode>,
)
