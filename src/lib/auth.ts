const AUTH_STORAGE_KEY = "getreal.auth";
const ROLE_STORAGE_KEY = "getreal.role";
const LAST_ACTIVE_KEY = "getreal.lastActive";

/** Log out after this much idle time (1 hour). */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export type AppRole = "superadmin" | "warehouse";

/** Demo credentials — replace with API auth when a server exists. */
export const DEMO_ACCOUNTS = {
  superadmin: {
    username: "admin",
    password: "getreal",
    role: "superadmin" as const,
    home: "/distributors",
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

function readLastActive(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function touchActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // no-op
  }
}

export function isIdleExpired(): boolean {
  const last = readLastActive();
  if (!last) return false;
  return Date.now() - last > IDLE_TIMEOUT_MS;
}

export function isAuthenticated(): boolean {
  try {
    if (localStorage.getItem(AUTH_STORAGE_KEY) !== "1") return false;
    const last = readLastActive();
    if (!last) {
      // Older sessions before idle tracking — start the clock now.
      touchActivity();
      return true;
    }
    if (Date.now() - last > IDLE_TIMEOUT_MS) {
      logout();
      return false;
    }
    return true;
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
    touchActivity();
  } catch {
    // Still treat as logged in for this session if storage is unavailable.
  }

  return account.role;
}

export function logout(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {
    // no-op
  }
}
