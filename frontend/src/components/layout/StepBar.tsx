import { Link } from "react-router-dom"
import { CheckIcon } from "../ui/icons.tsx"
import { cx } from "../../lib/cx.ts"

export function StepBar({
  profileId,
  step,
  applicationId,
  qaEnabled = false,
}: {
  profileId: string
  step: "job" | "preview" | "qa"
  applicationId?: string
  qaEnabled?: boolean
}) {
  const items = [
    { id: "job" as const, label: "Job details", href: `/profiles/${profileId}/apply` },
    {
      id: "preview" as const,
      label: "Tailored preview",
      href: applicationId ? `/profiles/${profileId}/apply/${applicationId}/preview` : undefined,
    },
    {
      id: "qa" as const,
      label: "Application QA",
      href: applicationId && qaEnabled ? `/profiles/${profileId}/apply/${applicationId}/qa` : undefined,
    },
  ]
  const currentIndex = items.findIndex((item) => item.id === step)

  return (
    <ol className="steps">
      {items.map((item, index) => {
        const current = index === currentIndex
        const done = index < currentIndex
        const body = (
          <>
            <span className="step-index">{done ? <CheckIcon /> : index + 1}</span>
            <span className="step-label">{item.label}</span>
          </>
        )
        return (
          <li key={item.id} className={cx("step", done && "is-done", current && "is-current")}>
            {item.href && !current ? (
              <Link to={item.href}>{body}</Link>
            ) : (
              <span aria-current={current ? "step" : undefined}>{body}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
