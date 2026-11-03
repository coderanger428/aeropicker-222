import { Button } from "../../../components/ui/Button.tsx"
import { TextField } from "../../../components/ui/TextField.tsx"
import { emptyCertificate } from "../../../domain/profileForm.ts"
import type { ProfileCertificate } from "../../../domain/types.ts"
import { ItemCard } from "./ItemCard.tsx"

export function CertificateList({
  items,
  onChange,
}: {
  items: ProfileCertificate[]
  onChange: (items: ProfileCertificate[]) => void
}) {
  function patch(id: string, next: Partial<ProfileCertificate>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)))
  }

  return (
    <section className="detail-section">
      <h2>Certificates</h2>
      {items.map((item, index) => (
        <ItemCard
          key={item.id}
          title={`Certificate ${index + 1}`}
          onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}
        >
          <div className="field-grid">
            <TextField label="Title" value={item.title} onChange={(event) => patch(item.id, { title: event.target.value })} />
            <TextField label="Link" value={item.link} onChange={(event) => patch(item.id, { link: event.target.value })} />
            <TextField
              label="Achieved date"
              type="date"
              value={item.achievedDate}
              onChange={(event) => patch(item.id, { achievedDate: event.target.value })}
            />
            <div className="field">
              <span className="field-label">Proof image</span>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(event) => patch(item.id, { proofFileName: event.target.files?.[0]?.name ?? "" })}
              />
              {item.proofFileName ? <p className="field-hint">{item.proofFileName}</p> : null}
            </div>
          </div>
        </ItemCard>
      ))}
      <Button type="button" onClick={() => onChange([...items, emptyCertificate()])}>
        Add certificate
      </Button>
    </section>
  )
}
