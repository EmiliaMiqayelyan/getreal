export type SessionAppRole = "superadmin" | "warehouse";

export function usernameToLoginEmail(username: string): string {
  const trimmed = username.trim();
  if (trimmed.includes("@")) return trimmed;
  if (trimmed === "admin") return "admin@getreal.com";
  if (trimmed === "warehouse") return "warehouse@getreal.com";
  return `${trimmed}@getreal.local`;
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
