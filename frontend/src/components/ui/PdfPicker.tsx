import type { ReactNode } from "react"
import { cx } from "../../lib/cx.ts"

export function PdfPicker({
  label,
  disabled = false,
  icon,
  className,
  onPick,
}: {
  label: string
  disabled?: boolean
  icon?: ReactNode
  className?: string
  onPick: (file: File) => void
}) {
  return (
    <label
      className={cx("btn", icon ? "btn-icon" : "btn-secondary", className, disabled && "is-disabled")}
      aria-label={icon ? label : undefined}
      title={icon ? label : undefined}
    >
      <input
        className="file-input"
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled}
        aria-label={label}
        title={label}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) onPick(file)
        }}
      />
      {icon ?? label}
    </label>
  )
}
