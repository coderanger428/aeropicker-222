import { useId } from "react"
import { TextField } from "../../../components/ui/TextField.tsx"
import type { ProfileDetails } from "../../../domain/types.ts"

export function PersonalFields({
  details,
  onChange,
}: {
  details: ProfileDetails
  onChange: (patch: Partial<ProfileDetails>) => void
}) {
  return (
    <section className="detail-section">
      <h2>Personal details</h2>
      <div className="field-grid">
        <TextField label="Full name" value={details.fullName} onChange={(event) => onChange({ fullName: event.target.value })} />
        <TextField label="Email" type="email" value={details.email} onChange={(event) => onChange({ email: event.target.value })} />
        <ContactField
          label="LinkedIn"
          value={details.linkedin}
          included={details.includeLinkedin}
          onValue={(linkedin) => onChange({ linkedin })}
          onIncluded={(includeLinkedin) => onChange({ includeLinkedin })}
        />
        <ContactField
          label="Phone"
          value={details.phone}
          included={details.includePhone}
          onValue={(phone) => onChange({ phone })}
          onIncluded={(includePhone) => onChange({ includePhone })}
        />
        <ContactField
          label="Address"
          value={details.address}
          included={details.includeAddress}
          span
          onValue={(address) => onChange({ address })}
          onIncluded={(includeAddress) => onChange({ includeAddress })}
        />
        <ContactField
          label="GitHub"
          value={details.github}
          included={details.includeGithub}
          onValue={(github) => onChange({ github })}
          onIncluded={(includeGithub) => onChange({ includeGithub })}
        />
        <ContactField
          label="Portfolio"
          value={details.portfolio}
          included={details.includePortfolio}
          onValue={(portfolio) => onChange({ portfolio })}
          onIncluded={(includePortfolio) => onChange({ includePortfolio })}
        />
        <ContactField
          label="X"
          value={details.x}
          included={details.includeX}
          onValue={(x) => onChange({ x })}
          onIncluded={(includeX) => onChange({ includeX })}
        />
        <ContactField
          label="Facebook"
          value={details.facebook}
          included={details.includeFacebook}
          onValue={(facebook) => onChange({ facebook })}
          onIncluded={(includeFacebook) => onChange({ includeFacebook })}
        />
      </div>
    </section>
  )
}

function ContactField({
  label,
  value,
  included,
  span,
  onValue,
  onIncluded,
}: {
  label: string
  value: string
  included: boolean
  span?: boolean
  onValue: (value: string) => void
  onIncluded: (included: boolean) => void
}) {
  const fieldId = useId()
  return (
    <div className={span ? "field field-span" : "field"}>
      <div className="contact-caption">
        <input
          className="contact-include"
          type="checkbox"
          checked={included}
          aria-label={`Include ${label} on the resume`}
          onChange={(event) => onIncluded(event.target.checked)}
        />
        <label className="field-label" htmlFor={fieldId}>
          {label}
        </label>
      </div>
      <input id={fieldId} className="input" value={value} onChange={(event) => onValue(event.target.value)} />
    </div>
  )
}
