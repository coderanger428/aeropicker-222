import type { ReactNode } from "react"
import { Button } from "../../../components/ui/Button.tsx"

export function ItemCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <article className="item-card">
      <header className="item-card-head">
        <h3>{title}</h3>
        <Button type="button" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </header>
      {children}
    </article>
  )
}
