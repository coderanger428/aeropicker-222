import { useId, type SelectHTMLAttributes } from "react"
import { cx } from "../../lib/cx.ts"

interface Option {
  value: string
  label: string
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: readonly Option[]
  hint?: string
  error?: string
}

export function SelectField({ label, options, hint, error, id, className, ...props }: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  return (
    <div className={cx("field", className)}>
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <select
        id={fieldId}
        className="select"
        aria-invalid={error ? true : undefined}
        aria-describedby={cx(hintId, errorId) || undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
