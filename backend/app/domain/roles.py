PRESET_ROLES = {
    "full-stack": "Full Stack Engineer",
    "backend": "Backend Engineer",
    "frontend": "Frontend Engineer",
    "ai-ml": "AI/ML Engineer",
    "data-scientist": "Data Scientist",
    "erp-crm": "ERP/CRM Integration Engineer",
}

REQUIRED_ROLE_KEY = "full-stack"


def canonical_role(role_key: str, role_label: str) -> tuple[str, str]:
    if role_key in PRESET_ROLES:
        return role_key, PRESET_ROLES[role_key]
    label = role_label.strip()
    if not role_key.startswith("custom-"):
        raise ValueError("Choose a resume slot before uploading.")
    if not label:
        raise ValueError("Enter a role name for this resume.")
    if len(label) > 80:
        raise ValueError("Role names must be 80 characters or fewer.")
    return role_key, label
