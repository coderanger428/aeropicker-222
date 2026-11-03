import { Button } from "../../../components/ui/Button.tsx"
import { CheckboxField } from "../../../components/ui/CheckboxField.tsx"
import { TextArea } from "../../../components/ui/TextArea.tsx"
import { TextField } from "../../../components/ui/TextField.tsx"
import { emptyExperience, emptyProject, monthValue } from "../../../domain/profileForm.ts"
import type { ProfileExperience } from "../../../domain/types.ts"
import { ItemCard } from "./ItemCard.tsx"

export function ExperienceList({
  items,
  onChange,
}: {
  items: ProfileExperience[]
  onChange: (items: ProfileExperience[]) => void
}) {
  function patch(id: string, next: Partial<ProfileExperience>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...next } : item)))
  }

  return (
    <section className="detail-section">
      <h2>Professional experience</h2>
      {items.map((item, index) => (
        <ItemCard key={item.id} title={`Experience ${index + 1}`} onRemove={() => onChange(items.filter((entry) => entry.id !== item.id))}>
          <div className="field-grid">
            <TextField label="Company name" value={item.company} onChange={(event) => patch(item.id, { company: event.target.value })} />
            <TextField label="Location" value={item.location} onChange={(event) => patch(item.id, { location: event.target.value })} />
            <TextField label="Start" type="month" value={monthValue(item.startDate)} onChange={(event) => patch(item.id, { startDate: event.target.value })} />
            <TextField
              label="End"
              type="month"
              value={item.current ? "" : monthValue(item.endDate)}
              disabled={item.current}
              onChange={(event) => patch(item.id, { endDate: event.target.value })}
            />
          </div>
          <CheckboxField
            label="Currently working"
            checked={item.current}
            onChange={(event) => patch(item.id, { current: event.target.checked, endDate: event.target.checked ? "" : item.endDate })}
          />
          <div className="nested-list">
            <h3>Projects</h3>
            {item.projects.map((project, projectIndex) => (
              <ItemCard
                key={project.id}
                title={`Project ${projectIndex + 1}`}
                onRemove={() => patch(item.id, { projects: item.projects.filter((entry) => entry.id !== project.id) })}
              >
                <TextField
                  label="Title"
                  value={project.title}
                  onChange={(event) =>
                    patch(item.id, {
                      projects: item.projects.map((entry) =>
                        entry.id === project.id ? { ...entry, title: event.target.value } : entry,
                      ),
                    })
                  }
                />
                <TextArea
                  label="Description"
                  value={project.description}
                  onChange={(event) =>
                    patch(item.id, {
                      projects: item.projects.map((entry) =>
                        entry.id === project.id ? { ...entry, description: event.target.value } : entry,
                      ),
                    })
                  }
                />
              </ItemCard>
            ))}
            <Button type="button" variant="secondary" onClick={() => patch(item.id, { projects: [...item.projects, emptyProject()] })}>
              Add project
            </Button>
          </div>
        </ItemCard>
      ))}
      <Button type="button" onClick={() => onChange([...items, emptyExperience()])}>
        Add experience
      </Button>
    </section>
  )
}
