import { Button } from "../../../components/ui/Button.tsx"
import { TextField } from "../../../components/ui/TextField.tsx"
import { emptyEducation, monthValue } from "../../../domain/profileForm.ts"
import type { ProfileEducation } from "../../../domain/types.ts"
import { ItemCard } from "./ItemCard.tsx"

export function EducationList({
  items,
  onChange,
}: {
  items: ProfileEducation[]
  onChange: (items: ProfileEducation[]) => void
}) {
  function patch(id: string, next: Partial<ProfileEducation>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)))
  }

  return (
    <section className="detail-section">
      <h2>Education</h2>
      {items.map((item, index) => (
        <ItemCard key={item.id} title={`School ${index + 1}`} onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}>
          <div className="field-grid">
            <TextField label="School name" value={item.school} onChange={(event) => patch(item.id, { school: event.target.value })} />
            <TextField label="Location" value={item.location} onChange={(event) => patch(item.id, { location: event.target.value })} />
            <TextField label="Study start" type="month" value={monthValue(item.startDate)} onChange={(event) => patch(item.id, { startDate: event.target.value })} />
            <TextField label="Study end" type="month" value={monthValue(item.endDate)} onChange={(event) => patch(item.id, { endDate: event.target.value })} />
            <TextField className="field-span" label="Degree" value={item.degree} onChange={(event) => patch(item.id, { degree: event.target.value })} />
          </div>
        </ItemCard>
      ))}
      <Button type="button" onClick={() => onChange([...items, emptyEducation()])}>
        Add education
      </Button>
    </section>
  )
}
