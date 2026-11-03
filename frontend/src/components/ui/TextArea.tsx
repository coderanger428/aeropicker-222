import { useId, type TextareaHTMLAttributes } from "react"
import { cx } from "../../lib/cx.ts"

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
  error?: string
}

export function TextArea({ label, hint, error, id, className, ...props }: TextAreaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className={cx("textarea", className)}
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
