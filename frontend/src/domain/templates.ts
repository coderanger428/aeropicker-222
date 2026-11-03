export interface DocumentTemplate {
  id: string
  label: string
}

export const DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  { id: "classic", label: "Classic" },
  { id: "plain", label: "Plain" },
  { id: "compact", label: "Compact" },
]
