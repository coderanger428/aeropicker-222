import type { ReactNode } from "react"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <div>
          <p className="eyebrow eyebrow-light">AeroPicker</p>
          <h1>AeroPicker</h1>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  )
}
