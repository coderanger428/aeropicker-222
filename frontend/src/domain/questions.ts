export function splitQuestions(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:[-*•]+|\d+[.)]|q\d+[.)]?)\s*/i, "").trim())
    .filter(Boolean)

  if (lines.length > 1) return lines
  const only = lines[0] ?? ""
  if (!only) return []
  const parts = only
    .split("?")
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length > 1) return parts.map((part) => (part.endsWith("?") ? part : `${part}?`))
  return [only]
}
