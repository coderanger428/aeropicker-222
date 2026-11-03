import { useId, type InputHTMLAttributes } from "react"
import { cx } from "../../lib/cx.ts"

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function TextField({ label, hint, error, id, className, ...props }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  return (
    <div className={cx("field", className)}>
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={cx(hintId, errorId) || undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
