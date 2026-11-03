const STOP_WORDS = new Set([
  "about", "ability", "able", "across", "after", "also", "and", "are", "been", "being",
  "candidate", "could", "experience", "for", "from", "have", "high", "including", "into",
  "job", "looking", "more", "must", "other", "our", "please", "plus", "preferred",
  "qualifications", "required", "requirements", "responsibilities", "role", "seeking",
  "should", "strong", "such", "team", "than", "that", "the", "their", "them", "then",
  "they", "this", "using", "well", "what", "when", "where", "which", "while", "will",
  "with", "within", "work", "working", "would", "year", "years", "you", "your",
])

export function extractKeywords(text: string, limit = 8): string[] {
  const matches = text.match(/[A-Za-z][A-Za-z0-9+.#-]{2,}/g) ?? []
  const counts = new Map<string, { display: string; count: number }>()
  for (const match of matches) {
    const display = match.replace(/[.+#-]+$/g, "")
    const key = display.toLowerCase()
    if (key.length < 4 || STOP_WORDS.has(key)) continue
    const current = counts.get(key)
    if (current) current.count += 1
    else counts.set(key, { display, count: 1 })
  }
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.display.localeCompare(right.display))
    .slice(0, limit)
    .map((entry) => entry.display)
}

export function skillLabel(word: string): string {
  if (word !== word.toLowerCase()) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}
