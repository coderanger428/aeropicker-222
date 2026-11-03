import type { ButtonHTMLAttributes } from "react"
import { cx } from "../../lib/cx.ts"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "md" | "lg"
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cx("btn", `btn-${variant}`, size === "lg" && "btn-lg", className)} {...props} />
}
