import type { ReactNode } from "react"
import { cx } from "../../lib/cx.ts"

export function Banner({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <div className={cx("banner", `banner-${tone}`)} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  )
}
