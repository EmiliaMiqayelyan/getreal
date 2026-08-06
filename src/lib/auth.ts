const AUTH_STORAGE_KEY = "getreal.auth";
const ROLE_STORAGE_KEY = "getreal.role";

export type AppRole = "superadmin" | "warehouse";

/** Demo credentials — replace with API auth when a server exists. */
export const DEMO_ACCOUNTS = {
  superadmin: {
    username: "admin",
    password: "getreal",
    role: "superadmin" as const,
    home: "/dashboard",
  },
  warehouse: {
    username: "warehouse",
    password: "getreal",
    role: "warehouse" as const,
    home: "/distributor-deliveries",
  },
} as const;

/** @deprecated Prefer DEMO_ACCOUNTS — kept for existing login hint copy */
export const DEMO_CREDENTIALS = {
  username: DEMO_ACCOUNTS.superadmin.username,
  password: DEMO_ACCOUNTS.superadmin.password,
} as const;

export function isAuthenticated(): boolean {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getRole(): AppRole | null {
  if (!isAuthenticated()) return null;
  try {
    const role = localStorage.getItem(ROLE_STORAGE_KEY);
    if (role === "superadmin" || role === "warehouse") return role;
  } catch {
    // fall through
  }
  return "superadmin";
}

export function getHomeRoute(): string {
  const role = getRole();
  if (role === "warehouse") return DEMO_ACCOUNTS.warehouse.home;
  return DEMO_ACCOUNTS.superadmin.home;
}

export function login(username: string, password: string): AppRole | null {
  const trimmed = username.trim();

  const account = Object.values(DEMO_ACCOUNTS).find(
    (entry) => entry.username === trimmed && entry.password === password,
  );

  if (!account) return null;

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, "1");
    localStorage.setItem(ROLE_STORAGE_KEY, account.role);
  } catch {
    // Still treat as logged in for this session if storage is unavailable.
  }

  return account.role;
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  } catch {
    // no-op
  }
}
