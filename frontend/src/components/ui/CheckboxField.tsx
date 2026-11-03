import { useId, type InputHTMLAttributes } from "react"

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string
}

export function CheckboxField({ label, id, ...props }: CheckboxFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <label className="check" htmlFor={fieldId}>
      <input id={fieldId} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  )
}
