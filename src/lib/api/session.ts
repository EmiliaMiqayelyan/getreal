export type SessionAppRole = "superadmin" | "warehouse";

/**
 * Map login form input to the email the backend expects.
 * Accepts a full email, or short usernames used in the admin UI.
 */
export function usernameToLoginEmail(username: string): string {
  const trimmed = username.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  if (trimmed.toLowerCase() === "admin") return "admin@example.com";
  if (trimmed.toLowerCase() === "warehouse") return "warehouse@example.com";
  return `${trimmed}@example.com`;
}

export function mapApiRoleToAppRole(apiRole?: string): SessionAppRole {
  const normalized = (apiRole ?? "").toLowerCase();
  if (
    normalized.includes("warehouse") ||
    normalized.includes("driver") ||
    normalized === "staff"
  ) {
    return "warehouse";
  }
  return "superadmin";
}
