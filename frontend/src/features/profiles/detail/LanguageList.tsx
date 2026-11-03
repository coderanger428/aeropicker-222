import { Button } from "../../../components/ui/Button.tsx"
import { SelectField } from "../../../components/ui/SelectField.tsx"
import { TextField } from "../../../components/ui/TextField.tsx"
import { emptyLanguage, LANGUAGE_LEVELS } from "../../../domain/profileForm.ts"
import type { ProfileLanguage } from "../../../domain/types.ts"
import { ItemCard } from "./ItemCard.tsx"

export function LanguageList({
  items,
  onChange,
}: {
  items: ProfileLanguage[]
  onChange: (items: ProfileLanguage[]) => void
}) {
  function patch(id: string, next: Partial<ProfileLanguage>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)))
  }

  return (
    <section className="detail-section">
      <h2>Languages</h2>
      {items.map((item, index) => (
        <ItemCard key={item.id} title={`Language ${index + 1}`} onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}>
          <div className="field-grid">
            <TextField label="Language" value={item.language} onChange={(event) => patch(item.id, { language: event.target.value })} />
            <SelectField
              label="Level"
              value={item.level}
              options={[{ value: "", label: "Select level" }, ...LANGUAGE_LEVELS]}
              onChange={(event) => patch(item.id, { level: event.target.value as ProfileLanguage["level"] })}
            />
          </div>
        </ItemCard>
      ))}
      <Button type="button" onClick={() => onChange([...items, emptyLanguage()])}>
        Add language
      </Button>
    </section>
  )
}
