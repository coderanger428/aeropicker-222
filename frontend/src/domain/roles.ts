export interface RoleSlot {
  roleKey: string
  roleLabel: string
  required: boolean
}

export const REQUIRED_ROLE_KEY = "full-stack"

export const PRESET_ROLES: readonly RoleSlot[] = [
  { roleKey: "full-stack", roleLabel: "Full Stack Engineer", required: true },
  { roleKey: "backend", roleLabel: "Backend Engineer", required: false },
  { roleKey: "frontend", roleLabel: "Frontend Engineer", required: false },
  { roleKey: "ai-ml", roleLabel: "AI/ML Engineer", required: false },
  { roleKey: "data-scientist", roleLabel: "Data Scientist", required: false },
  { roleKey: "erp-crm", roleLabel: "ERP/CRM Integration Engineer", required: false },
]

const SUGGESTIONS: readonly { pattern: RegExp; roleKey: string }[] = [
  { pattern: /erp|crm|salesforce|dynamics|netsuite|workday/, roleKey: "erp-crm" },
  { pattern: /front[- ]?end|\breact\b|ui engineer/, roleKey: "frontend" },
  { pattern: /back[- ]?end|\bserver\b|api engineer/, roleKey: "backend" },
  { pattern: /data scien|analytics/, roleKey: "data-scientist" },
  { pattern: /\b(ai|ml|machine learning|llm)\b/, roleKey: "ai-ml" },
  { pattern: /full[- ]?stack/, roleKey: "full-stack" },
]

export function suggestRoleKey(jobTitle: string): string {
  const title = jobTitle.toLowerCase()
  for (const suggestion of SUGGESTIONS) {
    if (suggestion.pattern.test(title)) return suggestion.roleKey
  }
  return REQUIRED_ROLE_KEY
}

export function hasRequiredResume(resumes: readonly { roleKey: string }[]): boolean {
  return resumes.some((resume) => resume.roleKey === REQUIRED_ROLE_KEY)
}

export function canonicalRole(
  roleKey: string,
  roleLabel: string,
): { roleKey: string; roleLabel: string } | { error: string } {
  const preset = PRESET_ROLES.find((role) => role.roleKey === roleKey)
  if (preset) return { roleKey: preset.roleKey, roleLabel: preset.roleLabel }
  const label = roleLabel.trim()
  if (!roleKey.startsWith("custom-")) return { error: "Choose a resume slot before uploading." }
  if (!label) return { error: "Enter a role name for this resume." }
  if (label.length > 80) return { error: "Role names must be 80 characters or fewer." }
  return { roleKey, roleLabel: label }
}

export function isPresetRole(roleKey: string): boolean {
  return PRESET_ROLES.some((role) => role.roleKey === roleKey)
}
