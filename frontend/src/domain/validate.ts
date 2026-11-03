export function validateNewPassword(password: string, confirm: string): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {}
  if (password.length < 4) errors.password = "Use at least 4 characters."
  if (!confirm) errors.confirm = "Confirm your password."
  else if (password !== confirm) errors.confirm = "Passwords do not match."
  return errors
}

export function validateJobLink(value: string): string | null {
  const link = value.trim()
  if (!link) return null
  try {
    const url = new URL(link)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Job link must start with http:// or https://."
    }
    return null
  } catch {
    return "Job link must be a valid URL."
  }
}
