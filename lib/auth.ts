export const ADMIN_ROLES = [
  "admin",
  "super_admin",
  "content_manager",
  "finance_manager",
  "administrator",
]

export function normalizeRole(role?: string | null) {
  return String(role ?? "user")
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, "_")
    .replace(/^_+|_+$/g, "") || "user"
}

export function isAdminRole(role?: string | null) {
  return ADMIN_ROLES.includes(normalizeRole(role))
}

export function getEffectiveRole(profileRole?: string | null, metadataRole?: string | null) {
  if (profileRole) return normalizeRole(profileRole)
  return normalizeRole(metadataRole ?? "user")
}

export function isStudentOrUserRole(role?: string | null) {
  const normalized = normalizeRole(role)
  return normalized === "student" || normalized === "user"
}

export function getRedirectPath(role?: string | null) {
  return isAdminRole(role) ? "/admin" : "/dashboard"
}
