export function safeNext(state: unknown): string {
  if (typeof state !== "object" || state === null || !("from" in state)) return "/"
  const from = state.from
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) return "/"
  return from
}
